// app/groups/[id]/edit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ProtectedLayout from "@/components/ProtectedLayout";
import { Button, Card, CardBody, Container, Typography } from "@/components/ui";
import { ArrowLeft, Save } from "lucide-react";
import { useGroup, updateGroup as apiUpdateGroup } from "@/stores/groups";
import { useAuthStore } from "@/stores/auth";
import { Field, FieldLabel, FieldError, inputClass } from "@/components/ui/commmon";
import { GROUP_TYPE_OPTIONS, GROUP_VISIBILITY_OPTIONS, UpdateGroupRequest } from "@/types";

type GroupForm = {
    name: string;
    description: string;
    type: string; // e.g. "fleet" | "coop" | "airport" | "city" | "custom"
    city: string;
    location: string;
    visibility: "public" | "private" | "restricted";
    isInviteOnly: boolean;
    tagsCsv: string; // UI-only (comma separated)
};

export default function EditGroupPage() {
    const { id } = useParams<{ id: string }>();
    const router = useRouter();
    const { user } = useAuthStore();

    const { data: group, isLoading, mutate } = useGroup(id);
    const [values, setValues] = useState<GroupForm | null>(null);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    const canManage = user?.roles?.some((r) => r === "admin" || r === "dispatcher");

    // hydrate form from group
    useEffect(() => {
        if (!group) return;
        setValues({
            name: group.name || "",
            description: group.description || "",
            type: group.type || "custom",
            city: group.city || "",
            location: group.location || "",
            visibility: (group.visibility as GroupForm["visibility"]) || "private",
            isInviteOnly: !!group.isInviteOnly,
            tagsCsv: (group.tags || []).join(", "),
        });
    }, [group]);

    const title = useMemo(
        () => (values?.name ? `Edit • ${values.name}` : "Edit Group"),
        [values?.name]
    );

    // Simple client-side validation
    function validate(v: GroupForm) {
        const e: Record<string, string> = {};
        if (!v.name.trim()) e.name = "Name is required";
        if (!v.type.trim()) e.type = "Type is required";
        if (!GROUP_VISIBILITY_OPTIONS.includes(v.visibility)) e.visibility = "Invalid visibility";
        return e;
    }

    async function onSubmit(ev: React.FormEvent) {
        ev.preventDefault();
        if (!id || !values) return;

        const e = validate(values);
        setErrors(e);
        if (Object.keys(e).length) return;

        setSaving(true);
        try {
            const payload = {
                name: values.name.trim(),
                description: values.description.trim() || undefined,
                type: values.type as any,
                city: values.city.trim() || undefined,
                location: values.location.trim() || undefined,
                visibility: values.visibility,
                isInviteOnly: !!values.isInviteOnly,
                tags: values.tagsCsv
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
            };

            const updated = await apiUpdateGroup(id, payload as UpdateGroupRequest);
            if (updated) {
                await mutate();
                router.push(`/groups/${id}`);
                return;
            }
            setSaving(false);
        } catch (err) {
            console.error(err);
            setErrors({ form: "Failed to save group" });
            setSaving(false);
        }
    }

    if (isLoading && !group) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Loading…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    if (!group) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Not found</div>
                </Container>
            </ProtectedLayout>
        );
    }

    if (!canManage) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">
                        You don’t have permission to edit this group.
                    </div>
                    <Button variant="outline" size="sm">
                        <Link href={`/groups/${group._id}`}>Back to Group</Link>
                    </Button>
                </Container>
            </ProtectedLayout>
        );
    }

    if (!values) {
        return (
            <ProtectedLayout>
                <Container className="px-3 sm:px-6 lg:px-8">
                    <div className="py-8 text-sm text-gray-600">Preparing form…</div>
                </Container>
            </ProtectedLayout>
        );
    }

    return (
        <ProtectedLayout>
            <Container className="px-3 sm:px-6 lg:px-8">
                <div className="space-y-4 sm:space-y-6">
                    {/* Toolbar */}
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <Button
                                variant="outline"
                                size="sm"
                                leftIcon={<ArrowLeft className="w-4 h-4" />}
                            >
                                <Link href={`/groups/${group._id}`}>Back</Link>
                            </Button>
                            <Typography
                                variant="h1"
                                className="text-base sm:text-2xl font-bold text-gray-900 whitespace-normal break-words leading-tight"
                            >
                                {title}
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
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <Field>
                                        <FieldLabel htmlFor="name">Name</FieldLabel>
                                        <input
                                            id="name"
                                            value={values.name}
                                            onChange={(e) =>
                                                setValues({ ...values, name: e.target.value })
                                            }
                                            className={inputClass(errors.name)}
                                            placeholder="e.g., Airport Drivers LA"
                                        />
                                        <FieldError message={errors.name} />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="type">Type</FieldLabel>
                                        <select
                                            id="type"
                                            value={values.type}
                                            onChange={(e) =>
                                                setValues({ ...values, type: e.target.value })
                                            }
                                            className={inputClass(errors.type)}
                                        >
                                            {GROUP_TYPE_OPTIONS.map((t) => (
                                                <option value={t} key={t}>
                                                    {t}
                                                </option>
                                            ))}
                                        </select>
                                        <FieldError message={errors.type} />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="visibility">Visibility</FieldLabel>
                                        <select
                                            id="visibility"
                                            value={values.visibility}
                                            onChange={(e) =>
                                                setValues({
                                                    ...values,
                                                    visibility: e.target
                                                        .value as GroupForm["visibility"],
                                                })
                                            }
                                            className={inputClass(errors.visibility)}
                                        >
                                            {GROUP_VISIBILITY_OPTIONS.map((v) => (
                                                <option value={v} key={v}>
                                                    {v}
                                                </option>
                                            ))}
                                        </select>
                                        <FieldError message={errors.visibility} />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="invite">Invite-only</FieldLabel>
                                        <label className="inline-flex items-center gap-2 text-sm">
                                            <input
                                                id="invite"
                                                type="checkbox"
                                                checked={values.isInviteOnly}
                                                onChange={(e) =>
                                                    setValues({
                                                        ...values,
                                                        isInviteOnly: e.target.checked,
                                                    })
                                                }
                                            />
                                            Only invited members can join
                                        </label>
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="city">City</FieldLabel>
                                        <input
                                            id="city"
                                            value={values.city}
                                            onChange={(e) =>
                                                setValues({ ...values, city: e.target.value })
                                            }
                                            className={inputClass()}
                                            placeholder="e.g., Los Angeles"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="location">Location</FieldLabel>
                                        <input
                                            id="location"
                                            value={values.location}
                                            onChange={(e) =>
                                                setValues({ ...values, location: e.target.value })
                                            }
                                            className={inputClass()}
                                            placeholder="e.g., LAX"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="desc">Description</FieldLabel>
                                        <textarea
                                            id="desc"
                                            rows={4}
                                            value={values.description}
                                            onChange={(e) =>
                                                setValues({
                                                    ...values,
                                                    description: e.target.value,
                                                })
                                            }
                                            className={inputClass()}
                                            placeholder="What is this group for?"
                                        />
                                    </Field>

                                    <Field>
                                        <FieldLabel htmlFor="tags">
                                            Tags (comma-separated)
                                        </FieldLabel>
                                        <input
                                            id="tags"
                                            value={values.tagsCsv}
                                            onChange={(e) =>
                                                setValues({ ...values, tagsCsv: e.target.value })
                                            }
                                            className={inputClass()}
                                            placeholder="airport, night, corporate"
                                        />
                                    </Field>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                                    <Button variant="outline">
                                        <Link href={`/groups/${group._id}`}>Cancel</Link>
                                    </Button>
                                    <Button
                                        type="submit"
                                        leftIcon={<Save className="w-4 h-4" />}
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
