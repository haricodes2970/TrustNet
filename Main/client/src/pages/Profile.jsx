import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Save, Trash2, User } from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../hooks/useAuth";
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  removeAvatar,
} from "../services/profile";

const FIELDS = [
  { name: "fullName", label: "Full Name", type: "text" },
  { name: "username", label: "Username", type: "text" },
  { name: "email", label: "Email", type: "email" },
  { name: "designation", label: "Designation", type: "text" },
  { name: "location", label: "Location", type: "text" },
  { name: "website", label: "Website", type: "text" },
  { name: "linkedin", label: "LinkedIn", type: "text" },
];

const EMPTY = {
  fullName: "",
  username: "",
  email: "",
  designation: "",
  location: "",
  website: "",
  linkedin: "",
  bio: "",
  avatar: "",
};

export default function ProfilePage() {
  const { setUser, fetchMe } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const fileRef = useRef(null);

  // Load profile on page load.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getProfile();
        if (!active) return;
        setForm({ ...EMPTY, ...data, avatar: data?.avatarUrl ?? "" });
        setUser?.((u) => ({ ...u, ...data }));
      } catch (err) {
        if (!active) return;
        setErrors({ form: err?.response?.data?.message || "Failed to load profile." });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [setUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
    setErrors((er) => ({ ...er, [name]: undefined, form: undefined }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      // `avatar` is managed via upload/remove, so omit it here to avoid
      // clearing an existing avatarUrl when saving the rest of the profile.
      const { avatar, ...payload } = form;
      const updated = await updateProfile(payload);
      let me = updated;
      try {
        me = (await fetchMe()) || updated;
      } catch {
        me = updated;
      }
      setForm((f) => ({
        ...f,
        fullName: me.fullName ?? f.fullName,
        username: me.username ?? f.username,
        email: me.email ?? f.email,
        designation: me.designation ?? f.designation,
        location: me.location ?? f.location,
        website: me.websiteUrl ?? f.website,
        linkedin: me.linkedin ?? f.linkedin,
        bio: me.bio ?? f.bio,
        avatar: me.avatarUrl ?? "",
      }));
      setUser?.((u) => ({ ...u, ...me }));
      setErrors({});
      setMessage({ type: "success", text: "Profile saved." });
    } catch (err) {
      const resp = err?.response?.data;
      // Surface backend validation errors field-by-field when provided.
      if (resp?.errors) {
        setErrors({ ...resp.errors, form: undefined });
      } else {
        setErrors({ form: resp?.message || "Failed to save profile." });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const data = await uploadAvatar(file);
      const updated = data?.user ?? data;
      let me = updated;
      try {
        me = (await fetchMe()) || updated;
      } catch {
        me = updated;
      }
      const avatar = me?.avatarUrl || data?.avatar || data?.url || "";
      setForm((f) => ({ ...f, avatar }));
      setUser?.((u) => ({ ...u, ...me }));
    } catch (err) {
      setErrors({ form: err?.response?.data?.message || "Avatar upload failed." });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setUploading(true);
    try {
      const data = await removeAvatar();
      const updated = data?.user ?? data;
      let me = updated;
      try {
        me = (await fetchMe()) || updated;
      } catch {
        me = updated;
      }
      setForm((f) => ({ ...f, avatar: "" }));
      setUser?.((u) => ({ ...u, ...me }));
    } catch (err) {
      setErrors({ form: err?.response?.data?.message || "Failed to remove avatar." });
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground shadow-card">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading profile…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your public profile and verification details.
        </p>

        {errors.form && (
          <p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {errors.form}
          </p>
        )}
        {message && (
          <p
            className={cn(
              "mt-4 rounded-lg px-3 py-2 text-sm font-medium",
              message.type === "success"
                ? "bg-success/15 text-success"
                : "bg-destructive/10 text-destructive"
            )}
          >
            {message.text}
          </p>
        )}

        {/* Avatar */}
        <div className="mt-6 flex items-center gap-4">
          <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-brand-gradient text-xl font-semibold text-primary-foreground">
            {form.avatar ? (
              <img src={form.avatar} alt="" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8" />
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              Upload Photo
            </button>
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={uploading || !form.avatar}
              className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-40"
            >
              <Trash2 className="h-4 w-4" /> Remove
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>
        </div>

        {/* Fields */}
        <form onSubmit={handleSave} className="mt-6 grid gap-4 sm:grid-cols-2">
          {FIELDS.map((f) => (
            <div key={f.name} className={cn(f.name === "email" && "sm:col-span-2")}>
              <label htmlFor={f.name} className="mb-1.5 block text-sm font-medium text-foreground">
                {f.label}
              </label>
              <input
                id={f.name}
                name={f.name}
                type={f.type}
                value={form[f.name] ?? ""}
                onChange={handleChange}
                className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
              />
              {errors[f.name] && (
                <p className="mt-1 text-xs font-medium text-destructive">{errors[f.name]}</p>
              )}
            </div>
          ))}

          <div className="sm:col-span-2">
            <label htmlFor="bio" className="mb-1.5 block text-sm font-medium text-foreground">
              Bio
            </label>
            <textarea
              id="bio"
              name="bio"
              rows={3}
              value={form.bio ?? ""}
              onChange={handleChange}
              placeholder="Tell the network who you are…"
              className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
            />
            {errors.bio && <p className="mt-1 text-xs font-medium text-destructive">{errors.bio}</p>}
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
