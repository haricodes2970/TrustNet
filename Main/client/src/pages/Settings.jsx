import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Laptop, Loader2, Lock, LogOut, Monitor, Palette, Shield, Smartphone, Trash2, User, Users } from "lucide-react";
import { cn } from "../lib/utils";
import { useTheme } from "../hooks/useTheme";
import { Switch } from "../components/ui/switch";
import { useAuth } from "../hooks/useAuth";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";
import {
  getSettings,
  updateProfileSettings,
  updatePreferences,
  updatePrivacy,
  updateAppearance,
  getSessions,
  deleteSession,
  deleteAccount,
  changePassword,
  getTwoFactorStatus,
  setupTwoFactor,
  enableTwoFactor,
  disableTwoFactor,
} from "../services/settings";

const sections = [
  { id: "profile", label: "Profile", icon: User },
  { id: "security", label: "Security", icon: Lock },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "privacy", label: "Privacy", icon: Shield },
  { id: "accounts", label: "Connected Accounts", icon: Users },
  { id: "sessions", label: "Sessions", icon: Monitor },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "danger", label: "Delete Account", icon: Trash2 },
];

const EMPTY_PROFILE = {
  fullName: "",
  email: "",
  designation: "",
  location: "",
  website: "",
  linkedin: "",
  bio: "",
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [section, setSection] = useState("profile");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [profileForm, setProfileForm] = useState(EMPTY_PROFILE);
  const [prefForm, setPrefForm] = useState({
    notifications: true,
    emailNotifications: true,
    marketingEmails: false,
  });
  const [privacyForm, setPrivacyForm] = useState({
    profileVisibility: "public",
    allowMessages: true,
    allowCollaborationRequests: true,
  });
  const [appearanceForm, setAppearanceForm] = useState({
    language: "en",
    timezone: "",
  });

  const { theme, setTheme } = useTheme();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingAppearance, setSavingAppearance] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [twoFactor, setTwoFactor] = useState({ enabled: false, setupInProgress: false });
  const [twoFactorSetup, setTwoFactorSetup] = useState(null);
  const [twoFactorMode, setTwoFactorMode] = useState(null);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [twoFactorPassword, setTwoFactorPassword] = useState("");
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [revokingId, setRevokingId] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleteSuccess, setDeleteSuccess] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const data = await getSettings();
        if (!active) return;
        const p = data.profile || {};
        const pref = data.preferences || {};
        setProfileForm({
          fullName: p.fullName || "",
          email: p.email || "",
          designation: p.designation || "",
          location: p.location || "",
          website: p.websiteUrl || "",
          linkedin: p.linkedin || "",
          bio: p.bio || "",
        });
        setPrefForm({
          notifications: pref.notifications ?? true,
          emailNotifications: pref.emailNotifications ?? true,
          marketingEmails: pref.marketingEmails ?? false,
        });
        setPrivacyForm({
          profileVisibility: pref.profileVisibility ?? "public",
          allowMessages: pref.allowMessages ?? true,
          allowCollaborationRequests: pref.allowCollaborationRequests ?? true,
        });
        setAppearanceForm({
          language: pref.language ?? "en",
          timezone: pref.timezone ?? "",
        });
      } catch (err) {
        if (!active) return;
        setError(err?.response?.data?.message || "Failed to load settings.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (section !== "sessions") return;
    let active = true;
    setSessionsLoading(true);
    getSessions()
      .then((data) => active && setSessions(Array.isArray(data) ? data : []))
      .catch(() => active && setSessions([]))
      .finally(() => active && setSessionsLoading(false));
    return () => {
      active = false;
    };
  }, [section]);

  useEffect(() => {
    if (section !== "security") return;
    let active = true;
    getTwoFactorStatus()
      .then((data) => active && setTwoFactor(data))
      .catch((err) => active && setMessage({ type: "error", text: err?.response?.data?.message || "Failed to load two-factor settings." }));
    return () => { active = false; };
  }, [section]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm((f) => ({ ...f, [name]: value }));
    setMessage(null);
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setMessage(null);
    try {
      const updated = await updateProfileSettings(profileForm);
      setProfileForm((f) => ({
        ...f,
        fullName: updated.fullName ?? f.fullName,
        email: updated.email ?? f.email,
        designation: updated.designation ?? f.designation,
        location: updated.location ?? f.location,
        website: updated.websiteUrl ?? f.website,
        linkedin: updated.linkedin ?? f.linkedin,
        bio: updated.bio ?? f.bio,
      }));
      setMessage({ type: "success", text: "Profile settings saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save profile settings.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    setMessage(null);
    try {
      await updatePreferences(prefForm);
      setMessage({ type: "success", text: "Notification preferences saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save preferences.",
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const savePrivacy = async () => {
    setSavingPrivacy(true);
    setMessage(null);
    try {
      await updatePrivacy(privacyForm);
      setMessage({ type: "success", text: "Privacy settings saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save privacy settings.",
      });
    } finally {
      setSavingPrivacy(false);
    }
  };

  const saveAppearance = async () => {
    setSavingAppearance(true);
    setMessage(null);
    try {
      await updateAppearance(appearanceForm);
      setMessage({ type: "success", text: "Appearance settings saved." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to save appearance settings.",
      });
    } finally {
      setSavingAppearance(false);
    }
  };

  const handleRevoke = async (id) => {
    setRevokingId(id);
    try {
      await deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      setMessage({ type: "success", text: "Session revoked. Please log in again." });
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.message || "Failed to revoke session.",
      });
    } finally {
      setRevokingId(null);
    }
  };

  const handlePasswordChange = (event) => {
    const { name, value } = event.target;
    setPasswordForm((form) => ({ ...form, [name]: value }));
    setMessage(null);
  };

  const handlePasswordSave = async (event) => {
    event.preventDefault();
    const { currentPassword, newPassword, confirmPassword } = passwordForm;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({ type: "error", text: "All password fields are required." });
      return;
    }
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword)) {
      setMessage({ type: "error", text: "New password must be at least 8 characters and include uppercase, lowercase, and a number." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New password and confirmation do not match." });
      return;
    }

    setSavingPassword(true);
    setMessage(null);
    try {
      await changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setMessage({ type: "success", text: "Password changed successfully." });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Unable to change password. Please try again." });
    } finally {
      setSavingPassword(false);
    }
  };

  const beginTwoFactorSetup = async () => {
    setTwoFactorLoading(true);
    setMessage(null);
    try {
      const data = await setupTwoFactor();
      setTwoFactorSetup(data);
      setTwoFactorMode("setup");
      setTwoFactorCode("");
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Unable to start two-factor setup." });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const confirmTwoFactorSetup = async () => {
    if (!/^\d{6}$/.test(twoFactorCode)) {
      setMessage({ type: "error", text: "Enter the 6-digit code from your authenticator app." });
      return;
    }
    setTwoFactorLoading(true);
    setMessage(null);
    try {
      await enableTwoFactor(twoFactorCode);
      setTwoFactor({ enabled: true, setupInProgress: false });
      setTwoFactorSetup(null);
      setTwoFactorMode(null);
      setTwoFactorCode("");
      setMessage({ type: "success", text: "Two-factor authentication enabled." });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Unable to enable two-factor authentication." });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const confirmTwoFactorDisable = async () => {
    if (!twoFactorPassword || !/^\d{6}$/.test(twoFactorCode)) {
      setMessage({ type: "error", text: "Enter your current password and a valid 6-digit authentication code." });
      return;
    }
    setTwoFactorLoading(true);
    setMessage(null);
    try {
      await disableTwoFactor(twoFactorPassword, twoFactorCode);
      setTwoFactor({ enabled: false, setupInProgress: false });
      setTwoFactorMode(null);
      setTwoFactorCode("");
      setTwoFactorPassword("");
      setMessage({ type: "success", text: "Two-factor authentication disabled." });
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.message || "Unable to disable two-factor authentication." });
    } finally {
      setTwoFactorLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!currentPassword) {
      setDeleteError("Enter your current password to confirm account deletion.");
      return;
    }

    setDeletingAccount(true);
    setDeleteError("");
    try {
      await deleteAccount(currentPassword);
      setDeleteSuccess("Account deleted. Redirecting to the home page…");
      await logout();
      navigate("/", { replace: true });
    } catch (err) {
      setDeleteError(err?.response?.data?.message || "Unable to delete your account. Please try again.");
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-6 text-muted-foreground shadow-card">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading settings…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-6">
      <h1 className="animate-fade-in text-2xl font-bold tracking-tight text-foreground">Settings</h1>
      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <nav className="flex gap-1 overflow-x-auto lg:flex-col">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                section === s.id
                  ? "bg-primary text-primary-foreground"
                  : s.id === "danger"
                    ? "text-destructive hover:bg-destructive/10"
                    : "text-muted-foreground hover:bg-muted"
              )}
            >
              <s.icon className="h-4 w-4" /> {s.label}
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-6">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          {message && (
            <p
              className={cn(
                "rounded-lg px-3 py-2 text-sm font-medium",
                message.type === "success"
                  ? "bg-success/15 text-success"
                  : "bg-destructive/10 text-destructive"
              )}
            >
              {message.text}
            </p>
          )}

          {section === "profile" && (
            <Card title="Profile Information" subtitle="Update your public profile details.">
              <form onSubmit={handleProfileSave} className="grid gap-4 sm:grid-cols-2">
                <SettingsInput
                  label="Full Name"
                  name="fullName"
                  value={profileForm.fullName}
                  onChange={handleProfileChange}
                />
                <SettingsInput
                  label="Email"
                  name="email"
                  type="email"
                  value={profileForm.email}
                  onChange={handleProfileChange}
                />
                <SettingsInput
                  label="Designation"
                  name="designation"
                  value={profileForm.designation}
                  onChange={handleProfileChange}
                />
                <SettingsInput
                  label="Location"
                  name="location"
                  value={profileForm.location}
                  onChange={handleProfileChange}
                />
                <SettingsInput
                  label="Website"
                  name="website"
                  value={profileForm.website}
                  onChange={handleProfileChange}
                />
                <SettingsInput
                  label="LinkedIn"
                  name="linkedin"
                  value={profileForm.linkedin}
                  onChange={handleProfileChange}
                />
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-foreground">Bio</label>
                  <textarea
                    name="bio"
                    rows={3}
                    value={profileForm.bio}
                    onChange={handleProfileChange}
                    placeholder="Tell the network who you are…"
                    className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div className="sm:col-span-2">
                  <SaveButton saving={savingProfile} />
                </div>
              </form>
            </Card>
          )}

          {section === "security" && (
            <>
              <Card title="Change Password" subtitle="Use a strong, unique password.">
                <form onSubmit={handlePasswordSave} noValidate>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <SettingsInput label="Current Password" name="currentPassword" type="password" value={passwordForm.currentPassword} onChange={handlePasswordChange} />
                    <div className="hidden sm:block" />
                    <SettingsInput label="New Password" name="newPassword" type="password" value={passwordForm.newPassword} onChange={handlePasswordChange} />
                    <SettingsInput label="Confirm New Password" name="confirmPassword" type="password" value={passwordForm.confirmPassword} onChange={handlePasswordChange} />
                  </div>
                  <SaveButton label="Update Password" saving={savingPassword} />
                </form>
              </Card>
              <Card
                title="Two-Factor Authentication"
                subtitle="Add an extra layer of security to your account."
              >
                <ToggleRow
                  label="Enable 2FA"
                  description="Require a code from your authenticator app when signing in."
                  checked={twoFactor.enabled}
                  onCheckedChange={(checked) => {
                    if (checked) beginTwoFactorSetup();
                    else { setTwoFactorMode("disable"); setTwoFactorCode(""); setTwoFactorPassword(""); }
                  }}
                />
                {twoFactorMode === "setup" && twoFactorSetup && (
                  <div className="mt-3 space-y-3 rounded-xl border border-border p-4">
                    <p className="text-sm text-muted-foreground">Scan this code with Google Authenticator, Microsoft Authenticator, or Authy, then enter the generated code.</p>
                    <img src={twoFactorSetup.qrCodeDataUrl} alt="Two-factor authentication QR code" className="h-40 w-40 rounded-lg bg-white p-2" />
                    <p className="break-all text-xs text-muted-foreground">Manual key: {twoFactorSetup.manualEntryKey}</p>
                    <SettingsInput label="Authentication Code" name="twoFactorCode" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
                    <SaveButton label="Confirm and Enable 2FA" saving={twoFactorLoading} onClick={confirmTwoFactorSetup} />
                  </div>
                )}
                {twoFactorMode === "disable" && (
                  <div className="mt-3 grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-2">
                    <SettingsInput label="Current Password" name="twoFactorPassword" type="password" value={twoFactorPassword} onChange={(event) => setTwoFactorPassword(event.target.value)} />
                    <SettingsInput label="Authentication Code" name="twoFactorDisableCode" value={twoFactorCode} onChange={(event) => setTwoFactorCode(event.target.value.replace(/\D/g, "").slice(0, 6))} />
                    <div className="sm:col-span-2"><SaveButton label="Disable 2FA" saving={twoFactorLoading} onClick={confirmTwoFactorDisable} /></div>
                  </div>
                )}
              </Card>
              <Card title="Login History" subtitle="Recent sign-ins to your account.">
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between">
                    <span className="text-foreground">San Francisco, CA — Chrome</span>
                    <span className="text-muted-foreground">Today, 9:14 AM</span>
                  </li>
                  <li className="flex justify-between">
                    <span className="text-foreground">San Francisco, CA — Safari</span>
                    <span className="text-muted-foreground">Yesterday, 7:52 PM</span>
                  </li>
                </ul>
              </Card>
            </>
          )}

          {section === "notifications" && (
            <Card
              title="Notification Preferences"
              subtitle="Choose what you want to be notified about."
            >
              <div className="space-y-1">
                <ToggleRow
                  label="Push notifications"
                  description="In-app notifications for activity on TrustNet."
                  checked={prefForm.notifications}
                  onCheckedChange={(v) => setPrefForm((f) => ({ ...f, notifications: v }))}
                />
                <ToggleRow
                  label="Email notifications"
                  description="Receive important updates by email."
                  checked={prefForm.emailNotifications}
                  onCheckedChange={(v) => setPrefForm((f) => ({ ...f, emailNotifications: v }))}
                />
                <ToggleRow
                  label="Marketing emails"
                  description="Product news and promotional offers."
                  checked={prefForm.marketingEmails}
                  onCheckedChange={(v) => setPrefForm((f) => ({ ...f, marketingEmails: v }))}
                />
              </div>
              <SaveButton saving={savingPrefs} onClick={savePrefs} />
            </Card>
          )}

          {section === "privacy" && (
            <Card title="Privacy" subtitle="Control who can see your information.">
              <div className="grid gap-4 sm:grid-cols-2">
                <SelectRow
                  label="Profile visibility"
                  value={privacyForm.profileVisibility}
                  onChange={(v) => setPrivacyForm((f) => ({ ...f, profileVisibility: v }))}
                  options={[
                    { value: "public", label: "Public" },
                    { value: "connections", label: "Connections only" },
                    { value: "private", label: "Private" },
                  ]}
                />
              </div>
              <div className="space-y-1">
                <ToggleRow
                  label="Allow messages"
                  description="Let other members message you directly."
                  checked={privacyForm.allowMessages}
                  onCheckedChange={(v) => setPrivacyForm((f) => ({ ...f, allowMessages: v }))}
                />
                <ToggleRow
                  label="Allow collaboration requests"
                  description="Let other members send you collaboration requests."
                  checked={privacyForm.allowCollaborationRequests}
                  onCheckedChange={(v) =>
                    setPrivacyForm((f) => ({ ...f, allowCollaborationRequests: v }))
                  }
                />
              </div>
              <SaveButton saving={savingPrivacy} onClick={savePrivacy} />
            </Card>
          )}

          {section === "accounts" && (
            <Card
              title="Connected Accounts"
              subtitle="Link accounts for faster sign-in and verification."
            >
              <div className="space-y-3">
                {[
                  { name: "Google", connected: true, detail: "sarah@loopwise.ai" },
                  { name: "LinkedIn", connected: true, detail: "linkedin.com/in/sarahchen" },
                  { name: "GitHub", connected: false, detail: "Not connected" },
                ].map((a) => (
                  <div
                    key={a.name}
                    className="flex items-center justify-between rounded-xl border border-border p-4"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{a.detail}</p>
                    </div>
                    <button
                      className={cn(
                        "rounded-lg px-4 py-1.5 text-xs font-semibold",
                        a.connected
                          ? "border border-border text-muted-foreground hover:bg-muted"
                          : "bg-primary text-primary-foreground hover:bg-primary-hover"
                      )}
                    >
                      {a.connected ? "Disconnect" : "Connect"}
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === "sessions" && (
            <Card title="Active Sessions" subtitle="Devices currently signed in to your account.">
              {sessionsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading sessions…
                </div>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active sessions found.</p>
              ) : (
                <div className="space-y-3">
                  {sessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-border p-4"
                    >
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft">
                        <Laptop className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                          {s.email || "This device"}
                          {s.current && (
                             <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
                              Current
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Signed in {s.createdAt ? new Date(s.createdAt).toLocaleString() : ""}
                        </p>
                      </div>
                      {s.current && (
                        <button
                          onClick={() => handleRevoke(s.id)}
                          disabled={revokingId === s.id}
                          className="rounded-lg border border-border px-3.5 py-1.5 text-xs font-semibold text-foreground hover:bg-muted disabled:opacity-50"
                        >
                          {revokingId === s.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Logout"
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {section === "appearance" && (
            <Card title="Appearance" subtitle="Customize how TrustNet looks for you.">
              <div className="grid gap-4 sm:grid-cols-2">
              <SelectRow
                label="Theme"
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
                <SelectRow
                  label="Language"
                  value={appearanceForm.language}
                  onChange={(v) => setAppearanceForm((f) => ({ ...f, language: v }))}
                  options={[
                    { value: "en", label: "English" },
                    { value: "es", label: "Español" },
                    { value: "fr", label: "Français" },
                    { value: "de", label: "Deutsch" },
                  ]}
                />
                <SettingsInput
                  label="Timezone"
                  value={appearanceForm.timezone}
                  onChange={(e) =>
                    setAppearanceForm((f) => ({ ...f, timezone: e.target.value }))
                  }
                />
              </div>
              <SaveButton saving={savingAppearance} onClick={saveAppearance} />
            </Card>
          )}

          {section === "danger" && (
            <Card
              title="Delete Account"
              subtitle="Permanently remove your account and all data."
            >
              <p className="text-sm text-muted-foreground">
                This action is irreversible. Your profile, connections, messages, and verification
                records will be permanently deleted.
              </p>
              <button onClick={() => { setCurrentPassword(""); setDeleteError(""); setDeleteSuccess(""); setDeleteDialogOpen(true); }} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground hover:opacity-90">
                <Trash2 className="h-4 w-4" /> Delete My Account
              </button>
            </Card>
          )}
        </div>
      </div>
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => !deletingAccount && setDeleteDialogOpen(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. Enter your current password to confirm deletion.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="delete-account-password">Current password</label>
            <input
              id="delete-account-password"
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              disabled={deletingAccount}
              className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            {deleteError && <p className="mt-2 text-xs font-medium text-destructive">{deleteError}</p>}
            {deleteSuccess && <p className="mt-2 text-xs font-medium text-success">{deleteSuccess}</p>}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingAccount}>Cancel</AlertDialogCancel>
            <button type="button" onClick={handleDeleteAccount} disabled={deletingAccount} className="inline-flex items-center justify-center rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60">
              {deletingAccount ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting…</> : "Delete account"}
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-card">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </div>
  );
}

function SettingsInput({ label, name, value, type = "text", onChange }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <input
        type={type}
        name={name}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      />
    </div>
  );
}

function SelectRow({ label, value, onChange, options }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({ label, description, checked, onCheckedChange }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function SaveButton({ label = "Save Changes", saving = false, onClick }) {
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={saving}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </button>
    );
  }
  return (
    <button
      type="submit"
      disabled={saving}
      className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-60"
    >
      {saving && <Loader2 className="h-4 w-4 animate-spin" />}
      {label}
    </button>
  );
}
