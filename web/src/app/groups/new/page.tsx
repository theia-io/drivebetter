// app/groups/new/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Save, Users } from "lucide-react";

import { createGroup } from "@/stores/groups";
import type { CreateGroupRequest, GroupType } from "@/types/group";
import { GROUP_TYPE_OPTIONS } from "@/types/group";

type FormState = {
    name: string;
    type: GroupType | "";
    description: string;
    city: string;
    location: string;
    rules: string;
};

const INITIAL_FORM: FormState = {
    name: "",
    type: "",
    description: "",
    city: "",
    location: "",
    rules: "",
};

export default function NewGroupPage() {
    const router = useRouter();
    const [form, setForm] = useState<FormState>(INITIAL_FORM);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
        setForm((prev) => ({ ...prev, [key]: value }));
    };

    function validate(): Record<string, string> {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = "Name is required";
        return e;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        const validation = validate();
        setErrors(validation);
        if (Object.keys(validation).length > 0) return;

        setSaving(true);
        try {
            const payload: CreateGroupRequest = {
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                type: form.type || undefined,
                city: form.city.trim() || undefined,
                location: form.location.trim() || undefined,
                rules: form.rules.trim() || undefined,
                // visibility / isInviteOnly / tags are server-defaulted; not set here
            };

            const created = await createGroup(payload);
            if (!created?._id) throw new Error("No group id returned");

            router.push(`/groups/${created._id}`);
        } catch (err) {
            console.error(err);
            setErrors({ form: "Failed to create group. Try again." });
            setSaving(false);
        }
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="flex justify-center">
                    <div className="w-full max-w-xl space-y-4 sm:space-y-6 py-4 sm:py-6">
                        {/* Top bar */}
                        <div className="flex items-center gap-2">
                            <Link href="/groups">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    leftIcon={<ArrowLeft className="w-4 h-4" />}
                                >
                                    Back
                                </Button>
                            </Link>

                            <div className="flex items-center gap-2">
                                <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-2">
                                    <Users className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div className="flex flex-col">
                                    <Typography className="text-base sm:text-2xl font-bold text-gray-900">
                                        Create group
                                    </Typography>
                                    <span className="text-xs sm:text-sm text-gray-500">
                                        Basic setup. You can manage members and sharing later.
                                    </span>
                                </div>
                            </div>
                        </div>

                        {errors.form && (
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                                {errors.form}
                            </div>
                        )}

                        <Card variant="elevated">
                            <CardBody className="p-4 sm:p-6">
                                <form
                                    onSubmit={handleSubmit}
                                    className="space-y-6"
                                    noValidate
                                >
                                    {/* Basic info */}
                                    <div className="space-y-4">
                                        <Field>
                                            <FieldLabel htmlFor="name">Group name</FieldLabel>
                                            <input
                                                id="name"
                                                value={form.name}
                                                onChange={(e) =>
                                                    setField("name", e.target.value)
                                                }
                                                className={inputClass(errors.name)}
                                                placeholder="Night shift LA drivers"
                                            />
                                            <FieldError message={errors.name} />
                                        </Field>

                                        <Field>
                                            <FieldLabel htmlFor="type">
                                                Type{" "}
                                                <span className="text-gray-400 text-xs">
                                                    (optional)
                                                </span>
                                            </FieldLabel>
                                            <select
                                                id="type"
                                                value={form.type}
                                                onChange={(e) =>
                                                    setField(
                                                        "type",
                                                        e.target.value as GroupType | ""
                                                    )
                                                }
                                                className={inputClass()}
                                            >
                                                <option value="">Select type…</option>
                                                {GROUP_TYPE_OPTIONS.map((opt) => (
                                                    <option key={opt} value={opt}>
                                                        {opt}
                                                    </option>
                                                ))}
                                            </select>
                                        </Field>

                                        <Field>
                                            <FieldLabel htmlFor="description">
                                                Description
                                            </FieldLabel>
                                            <textarea
                                                id="description"
                                                rows={3}
                                                value={form.description}
                                                onChange={(e) =>
                                                    setField("description", e.target.value)
                                                }
                                                className={inputClass()}
                                                placeholder="Short description of what this group is for"
                                            />
                                        </Field>
                                    </div>

                                    {/* Location */}
                                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                        <Field>
                                            <FieldLabel htmlFor="city">City</FieldLabel>
                                            <input
                                                id="city"
                                                value={form.city}
                                                onChange={(e) =>
                                                    setField("city", e.target.value)
                                                }
                                                className={inputClass()}
                                                placeholder="Los Angeles"
                                            />
                                        </Field>

                                        <Field>
                                            <FieldLabel htmlFor="location">
                                                Area / Zone{" "}
                                                <span className="text-gray-400 text-xs">
                                                    (optional)
                                                </span>
                                            </FieldLabel>
                                            <input
                                                id="location"
                                                value={form.location}
                                                onChange={(e) =>
                                                    setField("location", e.target.value)
                                                }
                                                className={inputClass()}
                                                placeholder="LAX / Westside"
                                            />
                                        </Field>
                                    </div>

                                    {/* Rules */}
                                    <Field>
                                        <FieldLabel htmlFor="rules">
                                            Group rules{" "}
                                            <span className="text-gray-400 text-xs">
                                                (optional)
                                            </span>
                                        </FieldLabel>
                                        <textarea
                                            id="rules"
                                            rows={4}
                                            value={form.rules}
                                            onChange={(e) =>
                                                setField("rules", e.target.value)
                                            }
                                            className={inputClass()}
                                            placeholder="Add rules or guidelines for this group (will be shown on group page)"
                                        />
                                    </Field>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                                        <Link href="/groups">
                                            <Button variant="outline" type="button">
                                                Cancel
                                            </Button>
                                        </Link>
                                        <Button
                                            type="submit"
                                            leftIcon={<Save className="w-4 h-4" />}
                                            disabled={saving}
                                        >
                                            {saving ? "Creating…" : "Create group"}
                                        </Button>
                                    </div>
                                </form>
                            </CardBody>
                        </Card>
                    </div>
                </div>
            </Container>
        </ProtectedLayout>
    );
}

/* --------------------------- Small helpers --------------------------- */

function Field(props: { children: React.ReactNode; className?: string }) {
    const { children, className = "" } = props;
    return <div className={`space-y-1.5 ${className}`}>{children}</div>;
}

function FieldLabel(props: { htmlFor?: string; children: React.ReactNode }) {
    const { htmlFor, children } = props;
    return (
        <label
            htmlFor={htmlFor}
            className="flex items-center text-sm font-medium text-gray-700"
        >
            {children}
        </label>
    );
}

function FieldError(props: { message?: string }) {
    if (!props.message) return null;
    return <p className="text-sm text-red-600">{props.message}</p>;
}

function inputClass(error?: string) {
    return [
        "w-full rounded-lg border px-3 py-2.5 text-sm sm:text-base",
        "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500",
        error ? "border-red-300" : "border-gray-300",
    ].join(" ");
}
