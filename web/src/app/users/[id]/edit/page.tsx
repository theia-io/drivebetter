"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Save } from "lucide-react";

import { updateUser, useUser } from "@/stores/users";

type Role = "driver" | "dispatcher" | "client" | "admin";

const ALL_ROLES: Role[] = ["driver", "dispatcher", "client", "admin"];

export default function EditUserPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();

    const { data: user, isLoading } = useUser(id);

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [roles, setRoles] = useState<Role[]>([]);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!user) return;
        setName(user.name || "");
        setEmail(user.email || "");
        setPhone(user.phone || "");
        setRoles(((user.roles || []) as Role[]).filter(Boolean));
    }, [user]);

    const roleSet = useMemo(() => new Set(roles), [roles]);

    function toggleRole(r: Role) {
        setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
    }

    function validate() {
        const e: Record<string, string> = {};
        if (!name.trim()) e.name = "Name is required";
        if (!email.trim()) e.email = "Email is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function onSubmit(ev: React.FormEvent) {
        ev.preventDefault();
        if (!validate()) return;
        setSaving(true);
        try {
            await updateUser(id, {
                name: name.trim(),
                email: email.trim(),
                phone: phone.trim() || undefined,
                roles: roles.length ? roles : undefined,
            });
            router.push(`/users/${id}`);
        } catch (err) {
            console.error(err);
            alert("Failed to save user");
        } finally {
            setSaving(false);
        }
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Link href={`/users/${id}`}>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                                >
                                    Back
                                </Button>
                            </Link>
                            <div className="min-w-0">
                                <Typography className="text-xs text-gray-500">Edit User</Typography>
                                <Typography
                                    variant="h1"
                                    className="text-base sm:text-2xl font-bold text-gray-900 whitespace-normal break-words leading-tight"
                                >
                                    {isLoading ? "Loading…" : user?.name || "—"}
                                </Typography>
                            </div>
                        </div>
                    </div>

                    {/* Form */}
                    <Card variant="elevated" className="max-w-3xl">
                        <CardBody className="p-4 sm:p-6">
                            <form onSubmit={onSubmit} className="space-y-6" noValidate>
                                <Field>
                                    <FieldLabel htmlFor="name">Name</FieldLabel>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className={inputClass(errors.name)}
                                        placeholder="Full name"
                                    />
                                    <FieldError message={errors.name} />
                                </Field>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="email">Email</FieldLabel>
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className={inputClass(errors.email)}
                                            placeholder="name@example.com"
                                        />
                                        <FieldError message={errors.email} />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="phone">Phone</FieldLabel>
                                        <input
                                            id="phone"
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className={inputClass()}
                                            placeholder="+1 555 000 0000"
                                        />
                                    </Field>
                                </div>

                                <Field>
                                    <FieldLabel>Roles</FieldLabel>
                                    <div className="flex flex-wrap gap-2">
                                        {ALL_ROLES.map((r) => (
                                            <label
                                                key={r}
                                                className="inline-flex items-center gap-2 text-sm"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={roleSet.has(r)}
                                                    onChange={() => toggleRole(r)}
                                                />
                                                {r}
                                            </label>
                                        ))}
                                    </div>
                                </Field>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <Link href={`/users/${id}`}>
                                        <Button variant="outline" className="w-full sm:w-auto">
                                            Cancel
                                        </Button>
                                    </Link>
                                    <Button
                                        type="submit"
                                        leftIcon={<Save className="w-4 h-4" />}
                                        className="w-full sm:w-auto"
                                        disabled={saving}
                                    >
                                        {saving ? "Saving…" : "Save Changes"}
                                    </Button>
                                </div>
                            </form>
                        </CardBody>
                    </Card>
                </div>
            </Container>
        </ProtectedLayout>
    );
}

/* ----------------------------- UI bits ----------------------------- */

function Field({ children }: { children: React.ReactNode }) {
    return <div className="space-y-1.5">{children}</div>;
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
    return (
        <label htmlFor={htmlFor} className="flex items-center text-sm font-medium text-gray-700">
            {children}
        </label>
    );
}

function FieldError({ message }: { message?: string }) {
    if (!message) return null;
    return <p className="text-sm text-red-600">{message}</p>;
}

function inputClass(error?: string) {
    return [
        "w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        error ? "border-red-300" : "border-gray-300",
    ].join(" ");
}
