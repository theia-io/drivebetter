// app/groups/new/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Save, Users as UsersIcon, Plus, X } from "lucide-react";
import DriverCombobox from "@/components/ui/DriverCombobox";
import { createGroup as apiCreateGroup } from "@/stores/groups";
import type {CreateGroupRequest} from "@/types"; // uses your existing store/service

type Visibility = "public" | "private";

type Form = {
    name: string;
    description: string;
    type: string;
    city: string;
    location: string;
    visibility: Visibility;
    isInviteOnly: boolean;
    tagsText: string;     // comma-separated
    members: Array<{ _id: string; name?: string; email?: string }>;
};

const initialForm: Form = {
    name: "",
    description: "",
    type: "",
    city: "",
    location: "",
    visibility: "public",
    isInviteOnly: false,
    tagsText: "",
    members: [],
};

export default function NewGroupPage() {
    const router = useRouter();
    const [form, setForm] = useState<Form>(initialForm);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const [selectedDriver, setSelectedDriver] = useState<any | null>(null);

    const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((s) => ({ ...s, [k]: v }));

    function validate(): Record<string, string> {
        const e: Record<string, string> = {};
        if (!form.name.trim()) e.name = "Name is required";
        return e;
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const eMap = validate();
        setErrors(eMap);
        if (Object.keys(eMap).length) return;

        setSaving(true);
        try {
            const payload = {
                name: form.name.trim(),
                description: form.description.trim() || undefined,
                type: form.type || undefined,
                city: form.city || undefined,
                location: form.location || undefined,
                visibility: form.visibility as Visibility,
                isInviteOnly: !!form.isInviteOnly,
                tags: splitCSV(form.tagsText),
                members: form.members.map((m) => m._id),
            };

            const created = await apiCreateGroup(payload as CreateGroupRequest);
            if (!created) throw new Error("Failed to create group");
            router.push(`/groups/${created._id}`);
        } catch (err) {
            console.error(err);
            setErrors({ form: "Failed to create group" });
            setSaving(false);
        }
    }

    function onAddMember() {
        if (!selectedDriver?._id) return;
        const exists = form.members.some((m) => m._id === selectedDriver._id);
        if (exists) {
            setSelectedDriver(null);
            return;
        }
        set("members", [
            ...form.members,
            { _id: selectedDriver._id, name: selectedDriver.name, email: selectedDriver.email },
        ]);
        setSelectedDriver(null);
    }

    function onRemoveMember(id: string) {
        set("members", form.members.filter((m) => m._id !== id));
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6 max-w-3xl">
                    {/* Toolbar */}
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                            <Link href="/groups">Back</Link>
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-indigo-50 rounded-xl border border-indigo-200">
                                <UsersIcon className="w-5 h-5 text-indigo-600" />
                            </div>
                            <Typography className="text-base sm:text-2xl font-bold text-gray-900">
                                Create Group
                            </Typography>
                        </div>
                    </div>

                    {errors.form && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {errors.form}
                        </div>
                    )}

                    <Card variant="elevated">
                        <CardBody className="p-4 sm:p-6">
                            <form onSubmit={onSubmit} className="space-y-6" noValidate>
                                {/* Basics */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="name">Name</FieldLabel>
                                        <input
                                            id="name"
                                            value={form.name}
                                            onChange={(e) => set("name", e.target.value)}
                                            className={inputClass(errors.name)}
                                            placeholder="Team LA Drivers"
                                        />
                                        <FieldError message={errors.name} />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="type">Type</FieldLabel>
                                        <input
                                            id="type"
                                            value={form.type}
                                            onChange={(e) => set("type", e.target.value)}
                                            className={inputClass()}
                                            placeholder="e.g., airport, corporate, nightly"
                                        />
                                    </Field>

                                    <Field className="sm:col-span-2">
                                        <FieldLabel htmlFor="description">Description</FieldLabel>
                                        <textarea
                                            id="description"
                                            rows={3}
                                            value={form.description}
                                            onChange={(e) => set("description", e.target.value)}
                                            className={inputClass()}
                                            placeholder="Short description of what this group is about"
                                        />
                                    </Field>
                                </div>

                                {/* Location-ish */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="city">City</FieldLabel>
                                        <input
                                            id="city"
                                            value={form.city}
                                            onChange={(e) => set("city", e.target.value)}
                                            className={inputClass()}
                                            placeholder="Los Angeles"
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="location">Location/Area</FieldLabel>
                                        <input
                                            id="location"
                                            value={form.location}
                                            onChange={(e) => set("location", e.target.value)}
                                            className={inputClass()}
                                            placeholder="LAX / Westside"
                                        />
                                    </Field>
                                </div>

                                {/* Visibility / Invite */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="visibility">Visibility</FieldLabel>
                                        <select
                                            id="visibility"
                                            value={form.visibility}
                                            onChange={(e) => set("visibility", e.target.value as Visibility)}
                                            className={inputClass()}
                                        >
                                            <option value="public">Public</option>
                                            <option value="private">Private</option>
                                        </select>
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="invite">Invite Only</FieldLabel>
                                        <div className="flex items-center gap-2">
                                            <input
                                                id="invite"
                                                type="checkbox"
                                                checked={form.isInviteOnly}
                                                onChange={(e) => set("isInviteOnly", e.target.checked)}
                                            />
                                            <span className="text-sm text-gray-700">Require invitations to join</span>
                                        </div>
                                    </Field>
                                </div>

                                {/* Tags */}
                                <Field>
                                    <FieldLabel htmlFor="tags">Tags (comma-separated)</FieldLabel>
                                    <input
                                        id="tags"
                                        value={form.tagsText}
                                        onChange={(e) => set("tagsText", e.target.value)}
                                        className={inputClass()}
                                        placeholder="airport, luxury, nights"
                                    />
                                </Field>

                                {/* Members add */}
                                <div className="space-y-2">
                                    <FieldLabel>Initial Members (optional)</FieldLabel>
                                    <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                                        <div className="flex-1 min-w-0">
                                            <DriverCombobox
                                                id="add-driver"
                                                valueEmail={selectedDriver?.email || ""}
                                                onChange={(driver: any | null) => setSelectedDriver(driver)}
                                            />
                                        </div>
                                        <Button
                                            size="sm"
                                            leftIcon={<Plus className="w-4 h-4" />}
                                            type="button"
                                            onClick={onAddMember}
                                            disabled={!selectedDriver?._id}
                                        >
                                            Add member
                                        </Button>
                                    </div>

                                    {/* Chips */}
                                    {!!form.members.length && (
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {form.members.map((m) => (
                                                <span
                                                    key={m._id}
                                                    className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs bg-white"
                                                    title={m.email || m._id}
                                                >
                          <span className="font-medium text-gray-900 truncate max-w-[10rem]">
                            {m.name || m.email || `User ${m._id.slice(-6)}`}
                          </span>
                                                    {m.email && <span className="text-gray-600 truncate max-w-[10rem]">• {m.email}</span>}
                                                    <button
                                                        type="button"
                                                        className="p-0.5 rounded hover:bg-gray-100"
                                                        onClick={() => onRemoveMember(m._id)}
                                                        aria-label={`Remove ${m.name || m.email || m._id}`}
                                                    >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    <Button variant="outline">
                                        <Link href="/groups">Cancel</Link>
                                    </Button>
                                    <Button type="submit" leftIcon={<Save className="w-4 h-4" />} disabled={saving}>
                                        {saving ? "Creating…" : "Create Group"}
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

/* ----------------------------- UI primitives ---------------------------- */

function Field({
                   children,
                   className = "",
               }: {
    children: React.ReactNode;
    className?: string;
}) {
    return <div className={`space-y-1.5 ${className}`}>{children}</div>;
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

/* ----------------------------- helpers ---------------------------- */

function splitCSV(s?: string): string[] | undefined {
    if (!s) return [];
    return s
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
}
