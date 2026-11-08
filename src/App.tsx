import { useState, useEffect, useRef } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Screen =
  | "splash" | "welcome" | "login" | "register" | "forgot-password"
  | "home"
  | "triage-intro" | "health-chat" | "audio-record" | "audio-transcribing" | "audio-review" | "audio-guidance-result"
  | "triage-q1" | "triage-q2" | "triage-q3" | "triage-q4" | "triage-q5"
  | "triage-processing" | "triage-result" | "triage-emergency"
  | "specialty" | "clinics" | "modality" | "professional" | "date" | "time-select" | "review"
  | "appointments" | "appointment-detail" | "history" | "notifications" | "profile"
  | "patient-documents"
  | "telemedicine-hub" | "telemedicine-waiting" | "telemedicine-call" | "telemedicine-complete"
  | "admin-home" | "admin-clinics" | "admin-clinic-form"
  | "admin-professionals" | "admin-professional-form"
  | "admin-specialties" | "admin-specialty-form"
  | "admin-availability" | "admin-users"
  | "prof-home" | "prof-agenda" | "prof-availability"
  | "prof-consultations" | "prof-consultation-detail" | "prof-profile"
  | "prof-notifications";

type Nav = (screen: Screen) => void;

interface Booking {
  specialty: string;
  clinic: string;
  doctor: string;
  date: string;
  time: string;
}

type CareModality = "Presencial" | "Telemedicina";
type TelemedicineRole = "patient" | "professional";
type TelemedicineState =
  | "scheduled"
  | "waiting-room-available"
  | "patient-waiting"
  | "professional-waiting"
  | "in-progress"
  | "completed"
  | "connection-error";

type AccessibilityPreferences = {
  largeText: boolean;
  highContrast: boolean;
};

const BIOMETRIC_CREDENTIAL_KEY = "consulta-facil-biometric-credential";

function arrayBufferToBase64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToArrayBuffer(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0)).buffer;
}

function hasStoredBiometricCredential() {
  return Boolean(localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY));
}

async function supportsBiometricAuthentication() {
  if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) return false;
  if (!PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) return true;
  return PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
}

async function registerBiometricCredential() {
  if (!(await supportsBiometricAuthentication())) {
    throw new Error("Este aparelho ou navegador não oferece acesso biométrico.");
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: "Consulta Fácil" },
      user: {
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: "maria@email.com",
        displayName: "Maria Aparecida Silva",
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      timeout: 60000,
      attestation: "none",
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Não foi possível criar a credencial biométrica.");
  }

  localStorage.setItem(BIOMETRIC_CREDENTIAL_KEY, arrayBufferToBase64Url(credential.rawId));
}

async function authenticateWithBiometrics() {
  const credentialId = localStorage.getItem(BIOMETRIC_CREDENTIAL_KEY);
  if (!credentialId) throw new Error("Ative primeiro o acesso biométrico no seu perfil.");

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{
        type: "public-key",
        id: base64UrlToArrayBuffer(credentialId),
        transports: ["internal"],
      }],
      userVerification: "required",
      timeout: 60000,
    },
  });

  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("A biometria não pôde ser confirmada.");
  }
}

function biometricErrorMessage(error: unknown) {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "Biometria não confirmada. Tente novamente ou entre com sua senha.";
  }
  return error instanceof Error ? error.message : "Não foi possível usar a biometria neste momento.";
}

// ─── Shared Components ───────────────────────────────────────────────────────

function StatusBar() {
  return (
    <div className="flex justify-between items-center px-5 pt-3 pb-1 text-xs font-semibold text-slate-700">
      <span>9:41</span>
      <div className="flex gap-1.5 items-center">
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor">
          <rect x="0" y="4" width="3" height="8" rx="0.5" opacity="0.4"/>
          <rect x="4.5" y="2.5" width="3" height="9.5" rx="0.5" opacity="0.6"/>
          <rect x="9" y="0.5" width="3" height="11.5" rx="0.5"/>
          <rect x="13.5" y="4" width="2" height="5" rx="0.5" fill="none" stroke="currentColor" strokeWidth="0.8"/>
          <rect x="14" y="5.5" width="1" height="2" rx="0.2"/>
        </svg>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M6 2C8.5 2 10.7 3.1 12 4.9L10.5 6.3C9.6 5 7.9 4 6 4C4.1 4 2.4 5 1.5 6.3L0 4.9C1.3 3.1 3.5 2 6 2Z" opacity="0.4"/>
          <path d="M6 5.5C7.5 5.5 8.8 6.2 9.7 7.3L8.2 8.7C7.7 8 6.9 7.5 6 7.5C5.1 7.5 4.3 8 3.8 8.7L2.3 7.3C3.2 6.2 4.5 5.5 6 5.5Z" opacity="0.7"/>
          <circle cx="6" cy="10" r="1.2"/>
        </svg>
        <span>100%</span>
      </div>
    </div>
  );
}

function Header({
  title, onBack, rightElement, light = false
}: {
  title?: string;
  onBack?: () => void;
  rightElement?: React.ReactNode;
  light?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between px-4 py-3 ${light ? "bg-transparent" : "bg-white"}`}>
      {onBack ? (
        <button
          onClick={onBack}
          className={`w-10 h-10 flex items-center justify-center rounded-full ${light ? "bg-white/20" : "bg-slate-100"}`}
          aria-label="Voltar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={light ? "white" : "#334155"} strokeWidth="2" strokeLinecap="round">
            <path d="M12 4L6 10L12 16" />
          </svg>
        </button>
      ) : (
        <div className="w-10" />
      )}
      {title && (
        <span className={`text-base font-semibold ${light ? "text-white" : "text-slate-800"}`}>{title}</span>
      )}
      {rightElement ?? <div className="w-10" />}
    </div>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="px-5 pb-4">
      <div className="flex justify-between text-xs text-slate-400 mb-1.5">
        <span>Pergunta {current} de {total}</span>
        <span>{Math.round((current / total) * 100)}%</span>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-cyan-500 rounded-full transition-all duration-300"
          style={{ width: `${(current / total) * 100}%` }}
        />
      </div>
    </div>
  );
}

function OptionButton({
  label, selected, onClick, icon
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 text-left transition-all ${
        selected
          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
          : "border-slate-100 bg-white text-slate-700 hover:border-slate-200"
      }`}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <span className="text-base font-medium">{label}</span>
      {selected && (
        <div className="ml-auto w-5 h-5 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0">
          <svg width="10" height="8" viewBox="0 0 10 8" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 4L3.5 6.5L9 1.5" />
          </svg>
        </div>
      )}
    </button>
  );
}

function PrimaryButton({
  label, onClick, disabled = false, fullWidth = true
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${fullWidth ? "w-full" : ""} bg-cyan-500 text-white text-base font-semibold py-4 px-6 rounded-2xl transition-all ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-cyan-600 active:scale-98"
      }`}
    >
      {label}
    </button>
  );
}

function SecondaryButton({
  label, onClick
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full border-2 border-slate-200 text-slate-700 text-base font-semibold py-4 px-6 rounded-2xl hover:bg-slate-50 transition-all"
    >
      {label}
    </button>
  );
}

function Disclaimer({ text }: { text: string }) {
  return (
    <div className="flex gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-3">
      <span className="text-amber-500 mt-0.5 flex-shrink-0">⚠</span>
      <p className="text-xs text-amber-700 leading-relaxed">{text}</p>
    </div>
  );
}

function BottomNav({ active, go }: { active: string; go: Nav }) {
  const items: { id: Screen; label: string; icon: React.ReactNode }[] = [
    {
      id: "home",
      label: "Início",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9.5L11 3L19 9.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/>
          <path d="M8 20V13h6v7"/>
        </svg>
      )
    },
    {
      id: "appointments",
      label: "Agendamentos",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="5" width="16" height="15" rx="2"/>
          <path d="M16 3v4M6 3v4M3 9h16"/>
          <path d="M7 13h8M7 16h5"/>
        </svg>
      )
    },
    {
      id: "history",
      label: "Histórico",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/>
          <path d="M11 7v4l3 3"/>
          <path d="M3.5 4.5L1.5 2.5M20.5 4.5L18.5 2.5"/>
        </svg>
      )
    },
    {
      id: "profile",
      label: "Perfil",
      icon: (
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="7" r="4"/>
          <path d="M3 19c0-4 3.6-7 8-7s8 3 8 7"/>
        </svg>
      )
    }
  ];

  return (
    <div className="flex justify-around items-center py-2 border-t border-slate-100 bg-white">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => go(item.id)}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors ${
            active === item.id ? "text-cyan-500" : "text-slate-400"
          }`}
        >
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Screens ─────────────────────────────────────────────────────────────────

function AppLogo({ size = 48, light = false }: { size?: number; light?: boolean }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 48 48" fill="none">
      {/* Chat bubble base — represents consultation/conversation */}
      <rect x="4" y="6" width="34" height="26" rx="8" fill={light ? "white" : "#06b6d4"} opacity={light ? 1 : 1} />
      {/* Tail */}
      <path d="M12 32L6 40L20 34" fill={light ? "white" : "#06b6d4"} />
      {/* Cross / plus inside bubble = health */}
      <path d="M21 15v12M15 21h12" stroke={light ? "#06b6d4" : "white"} strokeWidth="3.5" strokeLinecap="round" />
      {/* Small dot — subtle sparkle */}
      <circle cx="40" cy="10" r="4" fill="#fbbf24" />
    </svg>
  );
}

function SplashScreen({ go }: { go: Nav }) {
  useEffect(() => {
    const t = setTimeout(() => go("welcome"), 2200);
    return () => clearTimeout(t);
  }, [go]);

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gradient-to-b from-cyan-500 to-cyan-700">
      <div className="flex flex-col items-center gap-5">
        <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center shadow-xl">
          <AppLogo size={56} light={false} />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">Consulta Fácil</h1>
          <p className="text-cyan-100 text-sm mt-1.5">Cuidado acessível para todos</p>
        </div>
      </div>
      <div className="absolute bottom-16 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={`h-1.5 rounded-full bg-white ${i === 0 ? "w-5 opacity-100" : "w-1.5 opacity-40"}`} />
        ))}
      </div>
    </div>
  );
}

function WelcomeScreen({ go }: { go: Nav }) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 pb-16">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-800 leading-tight">
            Cuide do seu<br />próximo passo.
          </h1>
          <p className="text-base text-slate-500 leading-relaxed">
            Encontre o atendimento que você precisa de forma simples e segura.
          </p>
        </div>
      </div>
      <div className="px-6 pb-10 space-y-3">
        <PrimaryButton label="Começar" onClick={() => go("register")} />
        <SecondaryButton label="Já tenho uma conta" onClick={() => go("login")} />
      </div>
    </div>
  );
}


function LoginScreen({ go }: { go: Nav }) {
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [biometricReady, setBiometricReady] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricError, setBiometricError] = useState("");

  useEffect(() => {
    supportsBiometricAuthentication().then((supported) => {
      setBiometricReady(supported && hasStoredBiometricCredential());
    });
  }, []);

  const handleLogin = () => {
    const val = credential.toLowerCase();
    if (val.includes("prof") || val.includes("dr") || val.includes("medico") || val.includes("médico")) go("prof-home");
    else if (val.includes("admin")) go("admin-home");
    else go("home");
  };

  const demos: { icon: string; label: string; sub: string; dest: Screen; color: string }[] = [
    { icon: "👤", label: "Paciente",      sub: "Maria Silva",       dest: "home",       color: "border-slate-200 hover:border-cyan-300" },
    { icon: "🩺", label: "Profissional",  sub: "Dr. Carlos Mendes", dest: "prof-home",  color: "border-cyan-200 hover:border-cyan-400 bg-cyan-50/50" },
    { icon: "⚙️", label: "Administrador", sub: "Admin Recife",      dest: "admin-home", color: "border-slate-200 hover:border-cyan-300" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Entrar" onBack={() => go("welcome")} />
      <div className="flex-1 px-5 pt-5 space-y-4 overflow-y-auto no-scrollbar pb-8">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-1">Bem-vindo de volta</h2>
          <p className="text-sm text-slate-400">Entre com seu e-mail ou CPF e senha</p>
        </div>

        {/* Demo quick access */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3.5">
          <p className="text-xs font-bold text-amber-700 mb-2.5 uppercase tracking-wide">Protótipo — Acesso rápido</p>
          <div className="space-y-1.5">
            {demos.map((d) => (
              <button key={d.dest} onClick={() => go(d.dest)}
                className={`w-full flex items-center gap-3 bg-white rounded-xl px-3 py-2.5 border-2 transition-colors text-left ${d.color}`}>
                <span className="text-lg flex-shrink-0">{d.icon}</span>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700">{d.label}</p>
                  <p className="text-xs text-slate-400">{d.sub}</p>
                </div>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"><path d="M5 2l5 5-5 5"/></svg>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium">ou entre com seus dados</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">E-mail ou CPF</label>
            <input
              type="text"
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
              placeholder="seu@email.com ou 000.000.000-00"
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3.5 text-base text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border-2 border-slate-100 rounded-xl px-4 py-3.5 text-base text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors"
            />
          </div>
          <div className="text-right">
            <button onClick={() => go("forgot-password")} className="text-sm text-cyan-500 font-medium">Esqueci minha senha</button>
          </div>
        </div>
        <PrimaryButton label="Entrar" onClick={handleLogin} />
        {biometricReady && (
          <div className="space-y-2">
            <button
              onClick={async () => {
                setBiometricLoading(true);
                setBiometricError("");
                try {
                  await authenticateWithBiometrics();
                  go("home");
                } catch (error) {
                  setBiometricError(biometricErrorMessage(error));
                } finally {
                  setBiometricLoading(false);
                }
              }}
              disabled={biometricLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-cyan-200 bg-white px-6 py-4 text-base font-semibold text-cyan-700 transition-colors hover:bg-cyan-50 disabled:opacity-50"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M8 3.5A5.5 5.5 0 0012 2a5.5 5.5 0 014 1.5M5.5 7A7.5 7.5 0 0112 4a7.5 7.5 0 016.5 3M4 11a8 8 0 0116 0M7 11a5 5 0 0110 0v2.5M10 11a2 2 0 014 0v4.5M7 15v1a5 5 0 003 4.3M17 17.5a7 7 0 01-3 4M11 15.5V17a2 2 0 002 2" />
              </svg>
              {biometricLoading ? "Confirmando biometria..." : "Entrar com biometria"}
            </button>
            {biometricError && <p className="text-center text-sm font-medium text-red-600">{biometricError}</p>}
          </div>
        )}
        <div className="text-center pt-1">
          <button onClick={() => go("register")} className="text-sm text-slate-500">
            Não tenho uma conta{" "}
            <span className="text-cyan-500 font-semibold">Criar conta</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function HomeScreen({ go }: { go: Nav }) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <div className="bg-white pt-1">
        <StatusBar />
        <div className="px-5 pt-2 pb-5">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm text-slate-400 font-medium">Olá, Maria 👋</p>
              <h1 className="text-2xl font-bold text-slate-800 mt-0.5">Como podemos ajudar você hoje?</h1>
            </div>
            <button
              onClick={() => go("notifications")}
              className="relative w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 mt-1"
              aria-label="Notificações"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round">
                <path d="M10 2C10 2 5 5 5 11V14H15V11C15 5 10 2 10 2Z"/>
                <path d="M8 14v1a2 2 0 004 0v-1"/>
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 space-y-5 pb-4">
        {/* Main actions */}
        <div className="space-y-3">
          <button
            onClick={() => go("triage-intro")}
            className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl p-5 text-left shadow-sm"
          >
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🩺</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-base">Preciso de atendimento</p>
                <p className="text-cyan-100 text-sm mt-1 leading-snug">
                  Responda algumas perguntas e descubra qual atendimento pode ser mais adequado para você.
                </p>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-1">
                <path d="M7 4l6 6-6 6" />
              </svg>
            </div>
          </button>

          <button
            onClick={() => go("specialty")}
            className="w-full bg-white rounded-2xl p-5 text-left border-2 border-slate-100 shadow-sm"
          >
            <div className="flex gap-4 items-start">
              <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">🔍</span>
              </div>
              <div className="flex-1">
                <p className="text-slate-800 font-bold text-base">Já sei o que preciso</p>
                <p className="text-slate-400 text-sm mt-1 leading-snug">
                  Encontre uma especialidade, clínica ou profissional.
                </p>
              </div>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 mt-1">
                <path d="M7 4l6 6-6 6" />
              </svg>
            </div>
          </button>
        </div>

        {/* Next appointment */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Próximo atendimento</h2>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-50 flex items-center justify-center text-xl flex-shrink-0">
                🦴
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-slate-800">Dr. Carlos Mendes</p>
                    <p className="text-sm text-slate-400">Ortopedia · Clínica Boa Saúde</p>
                  </div>
                  <span className="text-xs font-semibold text-green-600 bg-green-50 px-2 py-1 rounded-lg">Confirmado</span>
                </div>
                <div className="mt-2 flex gap-3 text-sm text-slate-500">
                  <span>📅 16 out</span>
                  <span>⏰ 09:30</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-50">
              <button onClick={() => go("appointment-detail")} className="text-sm text-cyan-500 font-semibold">Ver detalhes →</button>
            </div>
          </div>
        </div>

        {/* Quick specialty access */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Especialidades rápidas</h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: "🫀", label: "Cardiologia" },
              { icon: "🦴", label: "Ortopedia" },
              { icon: "👁", label: "Oftalmologia" },
              { icon: "🧠", label: "Neurologia" },
              { icon: "🩺", label: "Geriatria" },
              { icon: "🔬", label: "Dermatologia" },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => go("clinics")}
                className="bg-white rounded-xl py-3 px-2 flex flex-col items-center gap-1.5 border border-slate-100 hover:border-cyan-200 transition-colors"
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-medium text-slate-600 text-center leading-tight">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="home" go={go} />
    </div>
  );
}

function TriageIntroScreen({ go }: { go: Nav }) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header onBack={() => go("home")} />
      <div className="flex-1 flex flex-col px-5 pt-2 pb-6">
        <div className="flex-1 flex flex-col justify-center items-center text-center gap-6">
          <div className="w-24 h-24 bg-cyan-50 rounded-3xl flex items-center justify-center">
            <span className="text-5xl">🩺</span>
          </div>
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-slate-800 leading-tight">
              Vamos entender o que você precisa
            </h1>
            <p className="text-base text-slate-500 leading-relaxed">
              Responda algumas perguntas para encontrarmos um possível caminho para o seu atendimento.
            </p>
          </div>
          <Disclaimer text="Esta orientação não substitui a avaliação de um profissional de saúde. Não fornecemos diagnósticos médicos." />
          <div className="flex gap-2 text-sm text-slate-400">
            <span>⏱</span>
            <span>Leva cerca de 2 minutos</span>
          </div>
        </div>
        <div className="space-y-3">
          <PrimaryButton label="Conversar com o assistente" onClick={() => go("health-chat")} />
          <button
            onClick={() => go("audio-record")}
            className="w-full flex items-center justify-center gap-3 border-2 border-cyan-200 bg-cyan-50 text-cyan-700 text-base font-semibold py-4 px-6 rounded-2xl hover:bg-cyan-100 transition-all"
          >
            <span className="text-xl">🎙️</span>
            <span>Falar sobre o que estou sentindo</span>
          </button>
        </div>
      </div>
    </div>
  );
}

type ChatAction = {
  label: string;
  value: string;
  navigation?: Screen;
};

type ChatAppointment = {
  id: string;
  specialty: string;
  doctor: string;
  clinic: string;
  date: string;
  dayReference: string;
  time: string;
  status: "Confirmada" | "Aguardando";
  code: string;
  modality?: CareModality;
};

type BookingDraft = {
  specialty: string;
  clinic: string;
  doctor: string;
  date: string;
  dayReference: string;
  time: string;
  modality?: CareModality;
};

type SummaryField = {
  value: string;
  state: "informed" | "not-informed" | "not-asked" | "not-clarified";
};

type PreConsultSummary = {
  consultId: number;
  appointmentCode: string;
  patient: string;
  professional: string;
  specialty: string;
  clinic: string;
  appointmentDate: string;
  appointmentTime: string;
  status: "draft" | "awaiting-consent" | "shared" | "insufficient";
  consent: "not-requested" | "pending" | "granted" | "declined";
  generatedAt: string;
  chiefComplaint: SummaryField;
  description: SummaryField;
  duration: SummaryField;
  evolution: SummaryField;
  intensity: SummaryField;
  location: SummaryField;
  frequency: SummaryField;
  associatedSymptoms: SummaryField;
  additionalInformation: SummaryField;
  unansweredQuestions: string[];
  needsClarification: string[];
  originalMessages: Array<{
    sender: "assistant" | "patient";
    text: string;
    time: string;
  }>;
};

type MedicalDocumentType =
  | "Receita médica"
  | "Atestado médico"
  | "Solicitação de exames"
  | "Resultado ou documento complementar"
  | "Relatório ou orientação pós-consulta"
  | "Outro documento";

type MedicalDocument = {
  id: number;
  consultId: number;
  patient: string;
  professional: string;
  specialty: string;
  consultationDate: string;
  type: MedicalDocumentType;
  title: string;
  description: string;
  fileName: string;
  fileFormat: string;
  fileSize: string;
  status: "draft" | "available" | "unavailable";
  madeAvailableAt?: string;
  version: number;
};

const MEDICAL_DOCUMENT_TYPES: MedicalDocumentType[] = [
  "Receita médica",
  "Atestado médico",
  "Solicitação de exames",
  "Resultado ou documento complementar",
  "Relatório ou orientação pós-consulta",
  "Outro documento",
];

type SymptomSummaryInput = {
  chiefComplaint: string;
  description: string;
  duration: string;
  intensity: string;
  associatedSymptoms: string;
};

type ChatWidget =
  | { type: "specialties"; clinic?: string }
  | { type: "specialty-suggestion"; specialty: string; reason: string }
  | { type: "modalities"; specialty: string }
  | { type: "clinics"; specialty?: string }
  | { type: "professionals"; draft: BookingDraft }
  | { type: "slots"; draft: BookingDraft; appointmentId?: string }
  | { type: "booking-review"; draft: BookingDraft }
  | { type: "booking-success"; appointment: ChatAppointment }
  | { type: "appointments"; appointments: ChatAppointment[] }
  | { type: "reschedule-review"; appointment: ChatAppointment; draft: BookingDraft }
  | { type: "cancel-review"; appointment: ChatAppointment }
  | { type: "task-success"; title: string; appointment: ChatAppointment }
  | { type: "summary-review"; summary: PreConsultSummary }
  | { type: "summary-consent"; summary: PreConsultSummary }
  | { type: "summary-shared"; summary: PreConsultSummary }
  | { type: "summary-insufficient" }
  | { type: "empty"; title: string; description: string };

type ChatMessage = {
  id: number;
  sender: "assistant" | "patient";
  text: string;
  time: string;
  actions?: ChatAction[];
  tone?: "default" | "urgent" | "error";
  widget?: ChatWidget;
};

const CHAT_INITIAL_MESSAGE: ChatMessage = {
  id: 1,
  sender: "assistant",
  text: "Olá! 👋 Sou o assistente virtual do Consulta Fácil. Você pode pedir para agendar, consultar, remarcar ou cancelar uma consulta sem sair desta conversa.",
  time: "Agora",
  actions: [
    { label: "Agendar consulta", value: "Quero agendar uma consulta" },
    { label: "Ver minhas consultas", value: "Quais são minhas consultas desta semana?" },
    { label: "Encontrar clínica", value: "Quero encontrar uma clínica perto de mim" },
    { label: "Orientação de saúde", value: "Estou com um sintoma" },
  ],
};

const CHAT_SPECIALTIES = [
  { name: "Clínica Geral", icon: "🏥" },
  { name: "Cardiologia", icon: "🫀" },
  { name: "Dermatologia", icon: "🔬" },
  { name: "Ortopedia", icon: "🦴" },
  { name: "Geriatria", icon: "🩺" },
  { name: "Neurologia", icon: "🧠" },
];

const CHAT_CLINICS = [
  { name: "Clínica Boa Saúde", neighborhood: "Boa Viagem", specialties: ["Ortopedia", "Cardiologia"] },
  { name: "UBS Imbiribeira", neighborhood: "Imbiribeira", specialties: ["Clínica Geral", "Geriatria"] },
  { name: "Centro Médico Recife", neighborhood: "Boa Vista", specialties: ["Neurologia", "Dermatologia", "Cardiologia"] },
];

const CHAT_PROFESSIONALS = [
  { id: 4, name: "Dr. Marcos Vieira", specialty: "Clínica Geral", clinic: "UBS Imbiribeira", crm: "Registro demonstrativo", online: true },
  { id: 1, name: "Dr. Carlos Mendes", specialty: "Ortopedia", clinic: "Clínica Boa Saúde", crm: "CRM-PE 24.501", online: true },
  { id: 2, name: "Dra. Ana Paula Costa", specialty: "Ortopedia", clinic: "Clínica Boa Saúde", crm: "CRM-PE 31.208", online: true },
  { id: 3, name: "Dra. Luciana Ferreira", specialty: "Cardiologia", clinic: "Clínica Boa Saúde", crm: "CRM-PE 28.940", online: true },
  { id: 5, name: "Dra. Fernanda Lima", specialty: "Dermatologia", clinic: "Centro Médico Recife", crm: "CRM-PE 30.112", online: true },
  { id: 6, name: "Dr. Roberto Alves", specialty: "Neurologia", clinic: "Centro Médico Recife", crm: "CRM-PE 18.774", online: false },
  { id: 7, name: "Dra. Helena Moura", specialty: "Geriatria", clinic: "UBS Imbiribeira", crm: "CRM-PE 27.601", online: true },
];

const CHAT_SLOTS = [
  { date: "Segunda, 20 out", dayReference: "Segunda-feira", time: "08:30" },
  { date: "Segunda, 20 out", dayReference: "Segunda-feira", time: "10:00" },
  { date: "Quarta, 22 out", dayReference: "Quarta-feira", time: "14:00" },
  { date: "Sexta, 24 out", dayReference: "Sexta-feira", time: "09:30" },
];

function ChatCardShell({ children }: { children: React.ReactNode }) {
  return <div className="mt-2 w-full space-y-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">{children}</div>;
}

function getSpecialtySuggestion(reportText: string) {
  const report = reportText.toLowerCase();
  if (["pele", "coceira", "mancha", "ferida", "unha"].some((term) => report.includes(term))) {
    return { specialty: "Dermatologia", reason: "O relato menciona alterações relacionadas à pele ou estruturas associadas." };
  }
  if (["costas", "joelho", "osso", "articulação", "articulacao", "movimento", "ombro"].some((term) => report.includes(term))) {
    return { specialty: "Ortopedia", reason: "O relato menciona dor ou desconforto relacionado ao movimento e ao aparelho locomotor." };
  }
  if (["cabeça", "cabeca", "enxaqueca", "tontura", "formigamento"].some((term) => report.includes(term))) {
    return { specialty: "Neurologia", reason: "O relato menciona sintomas como dor de cabeça, tontura ou alterações neurológicas." };
  }
  if (["palpitação", "palpitacao", "coração", "coracao", "pressão", "pressao"].some((term) => report.includes(term))) {
    return { specialty: "Cardiologia", reason: "O relato menciona uma preocupação relacionada ao coração ou à pressão." };
  }
  if (["memória", "memoria", "idoso", "idade avançada", "idade avancada"].some((term) => report.includes(term))) {
    return { specialty: "Geriatria", reason: "O relato pode se beneficiar de uma avaliação integral voltada à saúde da pessoa idosa." };
  }
  return { specialty: "Clínica Geral", reason: "Como o relato não aponta com clareza para uma área específica, a Clínica Geral pode ser uma porta de entrada." };
}

function HealthChatScreen({
  go,
  preConsultSummary,
  onSummaryChange,
  telemedicinePermissions,
}: {
  go: Nav;
  preConsultSummary: PreConsultSummary | null;
  onSummaryChange: (summary: PreConsultSummary) => void;
  telemedicinePermissions: Record<number, boolean>;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([CHAT_INITIAL_MESSAGE]);
  const [appointments, setAppointments] = useState<ChatAppointment[]>([
    {
      id: "apt-1",
      specialty: "Ortopedia",
      doctor: "Dr. Carlos Mendes",
      clinic: "Clínica Boa Saúde",
      date: "Amanhã, 16 out",
      dayReference: "Amanhã",
      time: "09:30",
      status: "Confirmada",
      code: "CF-04817",
    },
    {
      id: "apt-2",
      specialty: "Cardiologia",
      doctor: "Dra. Luciana Ferreira",
      clinic: "Centro Médico Recife",
      date: "Sexta, 18 out",
      dayReference: "Sexta-feira",
      time: "14:00",
      status: "Aguardando",
      code: "CF-05204",
    },
  ]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showRestart, setShowRestart] = useState(false);
  const [lastFailedMessage, setLastFailedMessage] = useState("");
  const [task, setTask] = useState<
    "idle" | "booking-specialty" | "booking-modality" | "booking-clinic" | "booking-professional" | "booking-slot" |
    "clinic-location" | "symptom-description" | "symptom-duration" | "symptom-intensity" | "symptom-other"
  >("idle");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft>({
    specialty: "",
    clinic: "",
    doctor: "",
    date: "",
    dayReference: "",
    time: "",
  });
  const [timePreference, setTimePreference] = useState<"morning" | "any">("any");
  const [symptomSummaryInput, setSymptomSummaryInput] = useState<SymptomSummaryInput>({
    chiefComplaint: "",
    description: "",
    duration: "",
    intensity: "",
    associatedSymptoms: "",
  });
  const [summaryCorrection, setSummaryCorrection] = useState("");
  const conversationRef = useRef<HTMLDivElement>(null);
  const messageId = useRef(2);

  useEffect(() => {
    conversationRef.current?.scrollTo({
      top: conversationRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isProcessing]);

  const currentTime = () => new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  const addAssistantMessage = (
    text: string,
    actions?: ChatAction[],
    tone: ChatMessage["tone"] = "default",
    widget?: ChatWidget,
  ) => {
    setMessages((current) => [...current, {
      id: messageId.current++,
      sender: "assistant",
      text,
      time: currentTime(),
      actions,
      tone,
      widget,
    }]);
  };

  const addPatientMessage = (text: string) => {
    setMessages((current) => [...current, {
      id: messageId.current++,
      sender: "patient",
      text,
      time: currentTime(),
    }]);
  };

  const summaryField = (
    value: string,
    emptyState: SummaryField["state"],
  ): SummaryField => ({
    value: value || (
      emptyState === "not-asked" ? "Não perguntado pelo assistente" :
      emptyState === "not-clarified" ? "Não esclarecido na conversa" :
      "Não informado pelo paciente"
    ),
    state: value ? "informed" : emptyState,
  });

  const preparePreConsultSummary = (targetAppointment?: ChatAppointment) => {
    if (preConsultSummary?.status === "shared") {
      addAssistantMessage(
        "Este resumo já foi compartilhado com consentimento para a consulta demonstrativa.",
        undefined,
        "default",
        { type: "summary-shared", summary: preConsultSummary },
      );
      return;
    }

    const hasHealthReport = Boolean(symptomSummaryInput.chiefComplaint || symptomSummaryInput.description);
    const reason = symptomSummaryInput.chiefComplaint ||
      (bookingDraft.specialty ? `Solicitação de atendimento em ${bookingDraft.specialty}` : "");
    const target = targetAppointment
      ? {
          consultId: targetAppointment.doctor === "Dr. Carlos Mendes" ? 1 : -1,
          appointmentCode: targetAppointment.code,
          professional: targetAppointment.doctor,
          specialty: targetAppointment.specialty,
          clinic: targetAppointment.clinic,
          appointmentDate: targetAppointment.date,
          appointmentTime: targetAppointment.time,
        }
      : {
          consultId: 1,
          appointmentCode: "CF-04817",
          professional: "Dr. Carlos Mendes",
          specialty: "Ortopedia",
          clinic: "Clínica Boa Saúde",
          appointmentDate: "Amanhã, 16 out",
          appointmentTime: "09:30",
        };

    if (!reason) {
      const insufficient: PreConsultSummary = {
        ...target,
        patient: "Maria Aparecida Silva",
        status: "insufficient",
        consent: "not-requested",
        generatedAt: currentTime(),
        chiefComplaint: summaryField("", "not-informed"),
        description: summaryField("", "not-informed"),
        duration: summaryField("", "not-informed"),
        evolution: summaryField("", "not-asked"),
        intensity: summaryField("", "not-informed"),
        location: summaryField("", "not-asked"),
        frequency: summaryField("", "not-asked"),
        associatedSymptoms: summaryField("", "not-informed"),
        additionalInformation: summaryField("", "not-informed"),
        unansweredQuestions: [],
        needsClarification: ["Motivo do atendimento não informado."],
        originalMessages: messages.map(({ sender, text, time }) => ({ sender, text, time })),
      };
      onSummaryChange(insufficient);
      addAssistantMessage(
        "Ainda não há informações suficientes para preparar um resumo. Conte o motivo do atendimento ou descreva sua necessidade.",
        undefined,
        "default",
        { type: "summary-insufficient" },
      );
      return;
    }

    const unansweredQuestions: string[] = [];
    if (hasHealthReport && !symptomSummaryInput.duration) unansweredQuestions.push("Há quanto tempo você está sentindo isso?");
    if (hasHealthReport && !symptomSummaryInput.intensity) unansweredQuestions.push("Como você descreveria a intensidade?");
    if (hasHealthReport && !symptomSummaryInput.associatedSymptoms) unansweredQuestions.push("Você apresenta algum outro sintoma junto?");

    const needsClarification = hasHealthReport
      ? [
          !symptomSummaryInput.duration && "Início e duração dos sintomas.",
          "Evolução desde o início.",
          "Localização e frequência, quando aplicável.",
        ].filter(Boolean) as string[]
      : ["Não houve relato de sintomas; confirmar o motivo do atendimento durante a consulta."];

    const summary: PreConsultSummary = {
      ...target,
      patient: "Maria Aparecida Silva",
      status: "draft",
      consent: "not-requested",
      generatedAt: `${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date())} às ${currentTime()}`,
      chiefComplaint: summaryField(reason, "not-informed"),
      description: summaryField(symptomSummaryInput.description, hasHealthReport ? "not-clarified" : "not-informed"),
      duration: summaryField(symptomSummaryInput.duration, hasHealthReport ? "not-clarified" : "not-informed"),
      evolution: summaryField("", "not-asked"),
      intensity: summaryField(symptomSummaryInput.intensity, hasHealthReport ? "not-clarified" : "not-informed"),
      location: summaryField("", "not-asked"),
      frequency: summaryField("", "not-asked"),
      associatedSymptoms: summaryField(symptomSummaryInput.associatedSymptoms, hasHealthReport ? "not-clarified" : "not-informed"),
      additionalInformation: summaryField("", "not-informed"),
      unansweredQuestions,
      needsClarification,
      originalMessages: messages.map(({ sender, text, time }) => ({ sender, text, time })),
    };
    onSummaryChange(summary);
    setSummaryCorrection("");
    addAssistantMessage(
      "Preparei um resumo demonstrativo somente com o que você informou. Revise antes de continuar.",
      undefined,
      "default",
      { type: "summary-review", summary },
    );
  };

  const continueToSummaryConsent = (summary: PreConsultSummary) => {
    const updated: PreConsultSummary = {
      ...summary,
      status: "awaiting-consent",
      consent: "pending",
      additionalInformation: summaryCorrection.trim()
        ? summaryField(`Correção ou complemento do paciente: ${summaryCorrection.trim()}`, "not-informed")
        : summary.additionalInformation,
    };
    setMessages((current) => current.map((message) =>
      message.widget?.type === "summary-review" ? { ...message, widget: undefined } : message
    ));
    onSummaryChange(updated);
    addAssistantMessage(
      "Antes de compartilhar, confirme sua autorização.",
      undefined,
      "default",
      { type: "summary-consent", summary: updated },
    );
  };

  const sharePreConsultSummary = (summary: PreConsultSummary) => {
    const shared = { ...summary, status: "shared" as const, consent: "granted" as const };
    onSummaryChange(shared);
    setMessages((current) => current.map((message) =>
      message.widget?.type === "summary-consent" || message.widget?.type === "summary-review"
        ? { ...message, widget: undefined }
        : message
    ));
    addAssistantMessage(
      "Consentimento registrado e resumo compartilhado no estado local do protótipo.",
      undefined,
      "default",
      { type: "summary-shared", summary: shared },
    );
  };

  const declineSummarySharing = (summary: PreConsultSummary) => {
    const declined = { ...summary, status: "awaiting-consent" as const, consent: "declined" as const };
    setMessages((current) => current.map((message) =>
      message.widget?.type === "summary-consent" ? { ...message, widget: undefined } : message
    ));
    onSummaryChange(declined);
    addAssistantMessage("Tudo bem. O resumo não foi compartilhado. Você pode autorizar mais tarde.", [
      { label: "Revisar consentimento", value: "prepare-summary" },
    ]);
  };

  const findSpecialty = (text: string) => CHAT_SPECIALTIES.find((specialty) => {
    const normalizedName = specialty.name.toLowerCase();
    return text.includes(normalizedName) ||
      (normalizedName === "dermatologia" && text.includes("dermatologista")) ||
      (normalizedName === "cardiologia" && text.includes("cardiologista")) ||
      (normalizedName === "ortopedia" && text.includes("ortopedista")) ||
      (normalizedName === "geriatria" && text.includes("geriatra")) ||
      (normalizedName === "neurologia" && text.includes("neurologista"));
  })?.name;

  const suggestSpecialty = (input: SymptomSummaryInput) => {
    return getSpecialtySuggestion([
      input.chiefComplaint,
      input.description,
      input.duration,
      input.intensity,
      input.associatedSymptoms,
    ].join(" "));
  };

  const startBooking = (specialty = "", clinic = "", modality?: CareModality) => {
    const nextDraft = { specialty, clinic, doctor: "", date: "", dayReference: "", time: "", modality };
    setBookingDraft(nextDraft);
    if (!specialty) {
      setTask("booking-specialty");
      addAssistantMessage("Qual especialidade você procura? Você também pode escrever o nome.", undefined, "default", {
        type: "specialties",
        clinic: clinic || undefined,
      });
      return;
    }
    if (!modality) {
      setTask("booking-modality");
      addAssistantMessage(
        `Como você prefere realizar a consulta em ${specialty}?`,
        undefined,
        "default",
        { type: "modalities", specialty },
      );
      return;
    }
    setTask("booking-clinic");
    addAssistantMessage(
      `Certo, vamos buscar atendimento em ${specialty}. Escolha uma clínica para continuar.`,
      undefined,
      "default",
      { type: "clinics", specialty },
    );
  };

  const matchingAppointments = (text: string) => {
    const active = appointments;
    if (text.includes("amanhã") || text.includes("amanha")) {
      return active.filter((appointment) => appointment.dayReference === "Amanhã");
    }
    if (text.includes("sexta")) {
      return active.filter((appointment) => appointment.dayReference === "Sexta-feira");
    }
    if (text.includes("ortopedia")) {
      return active.filter((appointment) => appointment.specialty === "Ortopedia");
    }
    if (text.includes("cardio")) {
      return active.filter((appointment) => appointment.specialty === "Cardiologia");
    }
    return active;
  };

  const respondToMessage = (message: string) => {
    const normalized = message.toLowerCase();
    const hasUrgentSignal = [
      "dor no peito", "falta de ar", "não consigo respirar", "desmaio",
      "desmaiei", "sangramento intenso", "confusão mental",
    ].some((signal) => normalized.includes(signal));

    if (hasUrgentSignal) {
      setTask("idle");
      setSymptomSummaryInput((current) => ({
        ...current,
        chiefComplaint: current.chiefComplaint || message,
        description: current.description || message,
      }));
      addAssistantMessage(
        "Alguns sinais que você descreveu podem precisar de atenção imediata. Se houver falta de ar intensa, dor forte no peito, desmaio ou piora rápida, procure um serviço de emergência agora. Não espere apenas por esta orientação.",
        [{ label: "Ver orientação de emergência", value: "emergency", navigation: "triage-emergency" }],
        "urgent",
      );
      return;
    }

    if (normalized.includes("erro") || normalized.includes("falha") || normalized.includes("sem conexão")) {
      setLastFailedMessage(message);
      addAssistantMessage(
        "Não consegui processar sua mensagem agora. Verifique sua conexão e tente novamente.",
        [{ label: "Tentar novamente", value: "retry" }],
        "error",
      );
      return;
    }

    if (task === "clinic-location") {
      setTask("idle");
      addAssistantMessage(
        `Obrigado. Estas são as clínicas demonstrativas disponíveis para consulta. A localização “${message}” não foi enviada a um serviço de mapas.`,
        undefined,
        "default",
        { type: "clinics" },
      );
      return;
    }

    if (task === "booking-specialty") {
      if (normalized.includes("não sei") || normalized.includes("nao sei") || normalized.includes("ainda não")) {
        startUnknownSpecialtyFlow(false);
        return;
      }
      const specialty = findSpecialty(normalized);
      if (specialty) {
        startBooking(specialty, bookingDraft.clinic, bookingDraft.modality);
      } else {
        addAssistantMessage("Não encontrei essa especialidade nos dados demonstrativos. Escolha uma das opções disponíveis.", undefined, "default", {
          type: "specialties",
          clinic: bookingDraft.clinic || undefined,
        });
      }
      return;
    }

    if (task === "booking-modality") {
      if (normalized.includes("online") || normalized.includes("telemedicina") || normalized.includes("virtual")) {
        startBooking(bookingDraft.specialty, bookingDraft.clinic, "Telemedicina");
      } else if (normalized.includes("presencial")) {
        startBooking(bookingDraft.specialty, bookingDraft.clinic, "Presencial");
      } else {
        addAssistantMessage("Escolha atendimento presencial ou telemedicina para continuar.", undefined, "default", {
          type: "modalities",
          specialty: bookingDraft.specialty,
        });
      }
      return;
    }

    if (task === "symptom-description") {
      setSymptomSummaryInput((current) => ({
        ...current,
        chiefComplaint: message,
        description: message,
      }));
      setTask("symptom-duration");
      addAssistantMessage(
        "Obrigado por explicar. Há quanto tempo isso está acontecendo?",
        [
          { label: "Começou hoje", value: "Começou hoje" },
          { label: "Há 2 ou 3 dias", value: "Há 2 ou 3 dias" },
          { label: "Há mais de uma semana", value: "Há mais de uma semana" },
        ],
      );
      return;
    }

    if (task === "booking-clinic") {
      const clinic = CHAT_CLINICS.find((item) => normalized.includes(item.name.toLowerCase()));
      if (clinic) {
        selectClinic(clinic.name, bookingDraft.specialty);
        return;
      }
      if (normalized.includes("manhã") || normalized.includes("manha")) setTimePreference("morning");
      addAssistantMessage(
        "Entendi a preferência e vou mantê-la nesta tarefa. Agora escolha uma clínica para continuar.",
        undefined,
        "default",
        { type: "clinics", specialty: bookingDraft.specialty },
      );
      return;
    }

    if (task === "booking-professional") {
      const professional = CHAT_PROFESSIONALS.find((item) => normalized.includes(item.name.toLowerCase()));
      if (professional) {
        selectProfessional(bookingDraft, professional.name);
        return;
      }
      addAssistantMessage("Ainda estamos escolhendo o profissional. Selecione uma das opções para continuar.", undefined, "default", {
        type: "professionals",
        draft: bookingDraft,
      });
      return;
    }

    if (task === "booking-slot") {
      const prefersMorning = normalized.includes("manhã") || normalized.includes("manha");
      const requestedDay = normalized.includes("segunda") ? "Segunda-feira" : normalized.includes("sexta") ? "Sexta-feira" : "";
      if (prefersMorning) setTimePreference("morning");
      const matchingSlot = CHAT_SLOTS.find((slot) =>
        (!requestedDay || slot.dayReference === requestedDay) &&
        (!prefersMorning || Number(slot.time.slice(0, 2)) < 12)
      );
      if (matchingSlot) {
        selectSlot(bookingDraft, matchingSlot);
        return;
      }
      addAssistantMessage("Não encontrei um horário com essa preferência nos dados demonstrativos. Escolha uma opção disponível.", undefined, "default", {
        type: "slots",
        draft: bookingDraft,
      });
      return;
    }

    if (task === "symptom-duration") {
      setSymptomSummaryInput((current) => ({ ...current, duration: message }));
      setTask("symptom-intensity");
      addAssistantMessage(
        "Obrigado. Como você descreveria a intensidade neste momento?",
        [
          { label: "Leve", value: "A intensidade está leve" },
          { label: "Moderada", value: "A intensidade está moderada" },
          { label: "Intensa", value: "A intensidade está intensa" },
        ],
      );
      return;
    }

    if (task === "symptom-intensity") {
      setSymptomSummaryInput((current) => ({ ...current, intensity: message }));
      setTask("symptom-other");
      addAssistantMessage(
        "Você apresenta algum outro sintoma junto?",
        [
          { label: "Não", value: "Não tenho outro sintoma" },
          { label: "Febre", value: "Também estou com febre" },
          { label: "Tontura", value: "Também estou com tontura" },
          { label: "Quero descrever", value: "Quero descrever outro sintoma" },
        ],
      );
      return;
    }

    if (task === "symptom-other") {
      const completedSymptomInput = { ...symptomSummaryInput, associatedSymptoms: message };
      const suggestion = suggestSpecialty(completedSymptomInput);
      setSymptomSummaryInput(completedSymptomInput);
      setTask("idle");
      addAssistantMessage(
        "Com base no que você informou, preparei uma sugestão de possível porta de entrada. Ela não é diagnóstico e deve ser confirmada por um profissional.",
        undefined,
        "default",
        { type: "specialty-suggestion", ...suggestion },
      );
      return;
    }

    const wantsCancel = ["cancelar", "cancela", "desmarcar"].some((term) => normalized.includes(term));
    if (wantsCancel) {
      const matches = matchingAppointments(normalized);
      if (matches.length === 0) {
        addAssistantMessage("Não encontrei uma consulta correspondente.", undefined, "default", {
          type: "empty",
          title: "Nenhuma consulta encontrada",
          description: "Tente informar o dia ou a especialidade.",
        });
      } else if (matches.length === 1) {
        addAssistantMessage("Encontrei esta consulta. Confira os dados antes de decidir.", undefined, "default", {
          type: "cancel-review",
          appointment: matches[0],
        });
      } else {
        addAssistantMessage("Encontrei mais de uma consulta. Qual delas você deseja cancelar?", undefined, "default", {
          type: "appointments",
          appointments: matches,
        });
      }
      return;
    }

    const wantsReschedule = ["remarcar", "reagendar", "mudar o horário", "trocar o horário"].some((term) => normalized.includes(term));
    if (wantsReschedule) {
      const matches = matchingAppointments(normalized);
      if (matches.length === 0) {
        addAssistantMessage("Não encontrei uma consulta correspondente.", undefined, "default", {
          type: "empty",
          title: "Nenhuma consulta encontrada",
          description: "Tente informar o dia ou a especialidade.",
        });
      } else {
        addAssistantMessage(
          matches.length === 1 ? "Encontrei esta consulta. Escolha “Remarcar” para ver novos horários." : "Qual consulta você deseja remarcar?",
          undefined,
          "default",
          { type: "appointments", appointments: matches },
        );
      }
      return;
    }

    const wantsAppointments = (
      normalized.includes("minhas consultas") ||
      normalized.includes("meus agendamentos") ||
      normalized.includes("consultas desta semana") ||
      normalized.includes("próximas consultas")
    );
    if (wantsAppointments) {
      addAssistantMessage(
        appointments.length > 0 ? "Estas são suas consultas demonstrativas ativas." : "Você não possui consultas ativas neste protótipo.",
        undefined,
        "default",
        appointments.length > 0
          ? { type: "appointments", appointments }
          : { type: "empty", title: "Nenhuma consulta agendada", description: "Posso ajudar você a encontrar um atendimento." },
      );
      return;
    }

    const wantsClinics = (
      normalized.includes("clínica") || normalized.includes("clinica") ||
      normalized.includes("perto de mim") || normalized.includes("onde atende")
    );
    if (wantsClinics) {
      setTask("clinic-location");
      addAssistantMessage(
        "Para ajudar na busca, informe apenas seu bairro ou escolha uma localização demonstrativa. Não acessamos sua localização real.",
        [
          { label: "Boa Viagem", value: "Boa Viagem" },
          { label: "Imbiribeira", value: "Imbiribeira" },
          { label: "Boa Vista", value: "Boa Vista" },
        ],
      );
      return;
    }

    const wantsSpecialties = (
      normalized.includes("especialidades") ||
      normalized.includes("tipos de atendimento") ||
      normalized.includes("quais médicos")
    );
    if (wantsSpecialties) {
      addAssistantMessage("Estas são algumas especialidades disponíveis nos dados demonstrativos.", undefined, "default", {
        type: "specialties",
      });
      return;
    }

    const wantsBooking = (
      normalized.includes("agendar") || normalized.includes("marcar") ||
      normalized.includes("quero consulta") || Boolean(findSpecialty(normalized))
    );
    if (wantsBooking) {
      setTimePreference(normalized.includes("manhã") || normalized.includes("manha") ? "morning" : "any");
      const requestedModality = normalized.includes("online") || normalized.includes("telemedicina") || normalized.includes("virtual")
        ? "Telemedicina" as const
        : normalized.includes("presencial") ? "Presencial" as const : undefined;
      startBooking(findSpecialty(normalized) ?? "", "", requestedModality);
      return;
    }

    const wantsHelp = ["ajuda", "o que você faz", "como funciona", "dúvida", "duvida"].some((term) => normalized.includes(term));
    if (wantsHelp) {
      addAssistantMessage(
        "Posso agendar, listar, remarcar ou cancelar consultas, mostrar clínicas e especialidades e oferecer orientação inicial de saúde.",
        [
          { label: "Agendar consulta", value: "Quero agendar uma consulta" },
          { label: "Ver consultas", value: "Quais são minhas consultas?" },
        ],
      );
      return;
    }

    if (normalized.includes("resumo") && (normalized.includes("consulta") || normalized.includes("relato"))) {
      preparePreConsultSummary();
      return;
    }

    const symptomTerms = ["dor", "febre", "tosse", "tontura", "cansaço", "sintoma", "sentindo"].some((term) => normalized.includes(term));
    if (symptomTerms || normalized.includes("não sei qual médico") || normalized.includes("nao sei qual medico")) {
      setSymptomSummaryInput((current) => ({
        ...current,
        chiefComplaint: current.chiefComplaint || message,
        description: current.description || message,
      }));
      setTask("symptom-duration");
      addAssistantMessage(
        "Entendi. Vou fazer perguntas breves, sem realizar diagnóstico. Há quanto tempo você está sentindo isso?",
        [
          { label: "Começou hoje", value: "Começou hoje" },
          { label: "Há 2 ou 3 dias", value: "Há 2 ou 3 dias" },
          { label: "Há mais de uma semana", value: "Há mais de uma semana" },
        ],
      );
      return;
    }

    addAssistantMessage(
      "Não consegui identificar a tarefa. Você pode reformular ou escolher uma destas opções.",
      [
        { label: "Agendar consulta", value: "Quero agendar uma consulta" },
        { label: "Ver minhas consultas", value: "Quais são minhas consultas?" },
        { label: "Encontrar clínica", value: "Quero encontrar uma clínica" },
      ],
    );
  };

  const sendMessage = (message = input) => {
    const cleanMessage = message.trim();
    if (!cleanMessage || isProcessing) return;

    addPatientMessage(cleanMessage);
    setInput("");
    setIsProcessing(true);
    window.setTimeout(() => {
      setIsProcessing(false);
      respondToMessage(cleanMessage);
    }, 900);
  };

  const handleAction = (action: ChatAction) => {
    if (action.navigation) {
      go(action.navigation);
      return;
    }
    if (action.value === "retry") {
      setMessages((current) => current.filter((message) => message.tone !== "error"));
      setIsProcessing(true);
      window.setTimeout(() => {
        setIsProcessing(false);
        setTask("idle");
        addAssistantMessage(
          "Conexão restabelecida. Como posso ajudar você agora?",
          [
            { label: "Agendar consulta", value: "Quero agendar uma consulta" },
            { label: "Ver minhas consultas", value: "Quais são minhas consultas?" },
          ],
        );
        setLastFailedMessage("");
      }, 900);
      return;
    }
    if (action.value === "prepare-summary") {
      if (preConsultSummary?.consent === "declined") {
        addAssistantMessage(
          "Este resumo continua sem compartilhamento. Revise e escolha se deseja autorizar o acesso para Dr. Carlos Mendes.",
          undefined,
          "default",
          { type: "summary-consent", summary: { ...preConsultSummary, consent: "pending" } },
        );
      } else {
        preparePreConsultSummary();
      }
      return;
    }
    sendMessage(action.value);
  };

  const startAudioSimulation = () => {
    if (isProcessing || isListening) return;
    setIsListening(true);
    window.setTimeout(() => {
      setIsListening(false);
      sendMessage("Quero marcar dermatologista na próxima semana pela manhã.");
    }, 1400);
  };

  const selectSpecialty = (specialty: string, clinic = bookingDraft.clinic) => {
    addPatientMessage(specialty);
    startBooking(specialty, clinic, bookingDraft.modality);
  };

  const startUnknownSpecialtyFlow = (recordChoice = true) => {
    if (recordChoice) addPatientMessage("Ainda não sei qual especialidade procurar");
    setTask("symptom-description");
    addAssistantMessage(
      "Sem problema. Você não precisa saber o nome da especialidade. Conte com suas palavras o que está acontecendo ou qual é sua principal preocupação. Não vou fazer diagnóstico; vou ajudar a organizar o próximo passo.",
    );
  };

  const selectClinic = (clinic: string, specialty?: string) => {
    addPatientMessage(clinic);
    if (!specialty) {
      const nextDraft = { ...bookingDraft, clinic };
      setBookingDraft(nextDraft);
      setTask("booking-specialty");
      addAssistantMessage("Estas especialidades são atendidas nesta clínica. Qual você procura?", undefined, "default", {
        type: "specialties",
        clinic,
      });
      return;
    }
    const nextDraft = { ...bookingDraft, clinic, specialty };
    setBookingDraft(nextDraft);
    setTask("booking-professional");
    addAssistantMessage("Escolha um profissional para continuar.", undefined, "default", {
      type: "professionals",
      draft: nextDraft,
    });
  };

  const selectProfessional = (draft: BookingDraft, doctor: string) => {
    addPatientMessage(doctor);
    const nextDraft = { ...draft, doctor };
    setBookingDraft(nextDraft);
    setTask("booking-slot");
    addAssistantMessage(
      timePreference === "morning" ? "Separei primeiro os horários da manhã disponíveis no protótipo." : "Escolha uma data e um horário.",
      undefined,
      "default",
      { type: "slots", draft: nextDraft },
    );
  };

  const selectSlot = (draft: BookingDraft, slot: typeof CHAT_SLOTS[number], appointmentId?: string) => {
    addPatientMessage(`${slot.date}, às ${slot.time}`);
    const nextDraft = { ...draft, ...slot };
    setBookingDraft(nextDraft);
    setTask("idle");
    if (appointmentId) {
      const appointment = appointments.find((item) => item.id === appointmentId);
      if (appointment) {
        addAssistantMessage("Confira a alteração antes de confirmar.", undefined, "default", {
          type: "reschedule-review",
          appointment,
          draft: nextDraft,
        });
      }
      return;
    }
    addAssistantMessage("Confira os dados antes de confirmar o agendamento.", undefined, "default", {
      type: "booking-review",
      draft: nextDraft,
    });
  };

  const confirmBooking = (draft: BookingDraft) => {
    const appointment: ChatAppointment = {
      id: `apt-${Date.now()}`,
      ...draft,
      status: "Confirmada",
      code: `CF-${String(Date.now()).slice(-5)}`,
    };
    setMessages((current) => current.map((message) =>
      message.widget?.type === "booking-review" ? { ...message, widget: undefined } : message
    ));
    setAppointments((current) => [...current, appointment]);
    setTask("idle");
    addAssistantMessage("Agendamento simulado concluído.", undefined, "default", {
      type: "booking-success",
      appointment,
    });
  };

  const confirmReschedule = (appointment: ChatAppointment, draft: BookingDraft) => {
    const updated = { ...appointment, date: draft.date, dayReference: draft.dayReference, time: draft.time };
    setMessages((current) => current.map((message) =>
      message.widget?.type === "reschedule-review" || message.widget?.type === "appointments"
        ? { ...message, widget: undefined }
        : message
    ));
    setAppointments((current) => current.map((item) => item.id === appointment.id ? updated : item));
    addAssistantMessage("A remarcação foi aplicada ao estado local do protótipo.", undefined, "default", {
      type: "task-success",
      title: "Consulta remarcada",
      appointment: updated,
    });
  };

  const confirmCancellation = (appointment: ChatAppointment) => {
    setMessages((current) => current.map((message) =>
      message.widget?.type === "cancel-review" || message.widget?.type === "appointments"
        ? { ...message, widget: undefined }
        : message
    ));
    setAppointments((current) => current.filter((item) => item.id !== appointment.id));
    addAssistantMessage("O cancelamento foi aplicado ao estado local do protótipo.", undefined, "default", {
      type: "task-success",
      title: "Consulta cancelada",
      appointment,
    });
  };

  const showAppointmentDetails = (appointment: ChatAppointment) => {
    addAssistantMessage(`Detalhes da consulta ${appointment.code}.`, undefined, "default", {
      type: "appointments",
      appointments: [appointment],
    });
  };

  const renderWidget = (widget: ChatWidget) => {
    if (widget.type === "specialties") {
      const clinicSpecialties = widget.clinic
        ? CHAT_CLINICS.find((clinic) => clinic.name === widget.clinic)?.specialties
        : undefined;
      const options = clinicSpecialties
        ? CHAT_SPECIALTIES.filter((specialty) => clinicSpecialties.includes(specialty.name))
        : CHAT_SPECIALTIES;
      return (
        <ChatCardShell>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Especialidades</p>
          <div className="grid grid-cols-2 gap-2">
            {options.map((specialty) => (
              <button key={specialty.name} onClick={() => selectSpecialty(specialty.name, widget.clinic)}
                className="flex min-h-14 items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 p-2.5 text-left text-sm font-semibold text-slate-700 hover:border-cyan-200">
                <span className="text-xl">{specialty.icon}</span>{specialty.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => startUnknownSpecialtyFlow()}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-cyan-200 bg-cyan-50 px-3 py-2.5 text-sm font-bold text-cyan-800 hover:bg-cyan-100"
          >
            <span aria-hidden="true">?</span>
            Ainda não sei
          </button>
        </ChatCardShell>
      );
    }

    if (widget.type === "specialty-suggestion") {
      const specialty = CHAT_SPECIALTIES.find((item) => item.name === widget.specialty);
      return (
        <ChatCardShell>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Sugestão da orientação simulada</p>
          <div className="rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white text-2xl shadow-sm">
                {specialty?.icon ?? "🩺"}
              </div>
              <div>
                <p className="text-xs font-semibold text-cyan-700">Possível especialidade</p>
                <p className="text-lg font-bold text-slate-800">{widget.specialty}</p>
              </div>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{widget.reason}</p>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">Esta indicação organiza o próximo passo e não representa diagnóstico, classificação clínica ou garantia de adequação.</p>
          <PrimaryButton label={`Agendar em ${widget.specialty}`} onClick={() => selectSpecialty(widget.specialty)} />
          <button onClick={() => startBooking()}
            className="w-full rounded-xl border-2 border-slate-200 py-3 text-sm font-semibold text-slate-700">Escolher outra especialidade</button>
        </ChatCardShell>
      );
    }

    if (widget.type === "modalities") {
      return (
        <ChatCardShell>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Modalidade do atendimento</p>
          <button onClick={() => {
            addPatientMessage("Quero atendimento por telemedicina");
            startBooking(widget.specialty, "", "Telemedicina");
          }} className="w-full rounded-xl border-2 border-cyan-200 bg-cyan-50 p-3 text-left">
            <p className="text-sm font-bold text-cyan-900">▣ Telemedicina</p>
            <p className="mt-1 text-xs leading-relaxed text-cyan-700">Consulta online em uma sala virtual demonstrativa.</p>
          </button>
          <button onClick={() => {
            addPatientMessage("Prefiro atendimento presencial");
            startBooking(widget.specialty, "", "Presencial");
          }} className="w-full rounded-xl border-2 border-slate-200 p-3 text-left">
            <p className="text-sm font-bold text-slate-800">🏥 Atendimento presencial</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">Atendimento realizado na clínica selecionada.</p>
          </button>
        </ChatCardShell>
      );
    }

    if (widget.type === "clinics") {
      const options = widget.specialty
        ? CHAT_CLINICS.filter((clinic) =>
            clinic.specialties.includes(widget.specialty!) &&
            (bookingDraft.modality !== "Telemedicina" || CHAT_PROFESSIONALS.some((professional) =>
              professional.clinic === clinic.name && professional.specialty === widget.specialty && professional.online
              && telemedicinePermissions[professional.id] !== false
            ))
          )
        : CHAT_CLINICS;
      if (options.length === 0) {
        return <ChatCardShell><p className="text-sm font-semibold text-slate-700">Nenhuma clínica demonstrativa encontrada.</p></ChatCardShell>;
      }
      return (
        <ChatCardShell>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Clínicas demonstrativas</p>
          {options.map((clinic) => (
            <button key={clinic.name} onClick={() => selectClinic(clinic.name, widget.specialty)}
              className="w-full rounded-xl border-2 border-slate-100 p-3 text-left hover:border-cyan-200">
              <p className="text-sm font-bold text-slate-800">{clinic.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">📍 {clinic.neighborhood}</p>
              <p className="mt-1 text-xs text-cyan-700">{clinic.specialties.join(" · ")}</p>
            </button>
          ))}
        </ChatCardShell>
      );
    }

    if (widget.type === "professionals") {
      const options = CHAT_PROFESSIONALS.filter((professional) =>
        professional.specialty === widget.draft.specialty &&
        professional.clinic === widget.draft.clinic &&
        (widget.draft.modality !== "Telemedicina" || professional.online)
        && (widget.draft.modality !== "Telemedicina" || telemedicinePermissions[professional.id] !== false)
      );
      if (options.length === 0) {
        return (
          <ChatCardShell>
            <p className="text-sm font-bold text-slate-700">Nenhum profissional demonstrativo encontrado</p>
            <p className="text-sm text-slate-500">Escolha outra clínica para continuar.</p>
            <button onClick={() => startBooking(widget.draft.specialty)}
              className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white">Escolher outra clínica</button>
          </ChatCardShell>
        );
      }
      return (
        <ChatCardShell>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Profissionais</p>
          {options.map((professional) => (
            <button key={professional.name} onClick={() => selectProfessional(widget.draft, professional.name)}
              className="w-full rounded-xl border-2 border-slate-100 p-3 text-left hover:border-cyan-200">
              <p className="text-sm font-bold text-slate-800">{professional.name}</p>
              <p className="text-xs text-slate-500">{professional.crm} · {professional.specialty}</p>
              <p className="mt-1 text-xs font-semibold text-cyan-700">{professional.online ? "Online e presencial" : "Somente presencial"}</p>
            </button>
          ))}
        </ChatCardShell>
      );
    }

    if (widget.type === "slots") {
      const slots = timePreference === "morning" ? CHAT_SLOTS.filter((slot) => Number(slot.time.slice(0, 2)) < 12) : CHAT_SLOTS;
      return (
        <ChatCardShell>
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Horários demonstrativos · {widget.draft.modality ?? "Presencial"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {slots.map((slot) => (
              <button key={`${slot.date}-${slot.time}`} onClick={() => selectSlot(widget.draft, slot, widget.appointmentId)}
                className="rounded-xl border-2 border-cyan-100 bg-cyan-50 p-3 text-left text-cyan-800 hover:border-cyan-300">
                <p className="text-xs font-semibold">{slot.date}</p>
                <p className="mt-1 text-base font-bold">{slot.time}</p>
              </button>
            ))}
          </div>
        </ChatCardShell>
      );
    }

    const DetailRows = ({ appointment }: { appointment: ChatAppointment | BookingDraft }) => (
      <div className="space-y-2 text-sm">
        {[
          ["Especialidade", appointment.specialty],
          ["Profissional", appointment.doctor],
          ["Clínica", appointment.clinic],
          ["Modalidade", appointment.modality ?? "Presencial"],
          ["Data", appointment.date],
          ["Horário", appointment.time],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3">
            <span className="text-slate-400">{label}</span>
            <span className="text-right font-semibold text-slate-700">{value}</span>
          </div>
        ))}
      </div>
    );

    const SummaryFieldRow = ({ label, field }: { label: string; field: SummaryField }) => {
      const stateLabel = {
        informed: "Informado",
        "not-informed": "Não informado",
        "not-asked": "Não perguntado",
        "not-clarified": "Não esclarecido",
      }[field.state];
      return (
        <div className="border-b border-slate-100 py-2.5 last:border-0">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-slate-400">{label}</p>
            <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
              field.state === "informed" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
            }`}>{stateLabel}</span>
          </div>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{field.value}</p>
        </div>
      );
    };

    if (widget.type === "booking-review") {
      return (
        <ChatCardShell>
          <p className="text-sm font-bold text-slate-800">Revisar agendamento</p>
          <DetailRows appointment={widget.draft} />
          <PrimaryButton label="Confirmar agendamento" onClick={() => confirmBooking(widget.draft)} />
          <button onClick={() => startBooking()} className="w-full py-2 text-sm font-semibold text-slate-500">Alterar informações</button>
        </ChatCardShell>
      );
    }

    if (widget.type === "booking-success" || widget.type === "task-success") {
      const appointment = widget.appointment;
      const title = widget.type === "booking-success" ? "Agendamento simulado concluído" : widget.title;
      return (
        <ChatCardShell>
          <div className="rounded-xl bg-green-50 p-3">
            <p className="font-bold text-green-800">✓ {title}</p>
            <p className="mt-0.5 text-xs text-green-700">Código demonstrativo: {appointment.code}</p>
          </div>
          <DetailRows appointment={appointment} />
          {widget.type === "booking-success" && (
            <button onClick={() => preparePreConsultSummary(appointment)}
              className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white">Preparar resumo pré-consulta</button>
          )}
          <button onClick={() => sendMessage("Quais são minhas consultas?")} className="w-full rounded-xl border-2 border-cyan-200 py-3 text-sm font-bold text-cyan-700">Ver minhas consultas</button>
          <button onClick={() => addAssistantMessage("Certo. Qual tarefa você deseja realizar agora?", CHAT_INITIAL_MESSAGE.actions)} className="w-full py-2 text-sm font-semibold text-slate-500">Iniciar nova tarefa</button>
        </ChatCardShell>
      );
    }

    if (widget.type === "summary-review") {
      const summary = widget.summary;
      return (
        <ChatCardShell>
          <div>
            <p className="text-sm font-bold text-slate-800">Revise seu resumo</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-500">O relato original não será alterado. Correções serão adicionadas como complemento.</p>
          </div>
          <SummaryFieldRow label="Motivo principal" field={summary.chiefComplaint} />
          <SummaryFieldRow label="Descrição relatada" field={summary.description} />
          <SummaryFieldRow label="Início e duração" field={summary.duration} />
          <SummaryFieldRow label="Intensidade" field={summary.intensity} />
          <SummaryFieldRow label="Sintomas associados" field={summary.associatedSymptoms} />
          <div className="rounded-xl bg-amber-50 p-3">
            <p className="text-xs font-bold text-amber-900">Informações que o profissional ainda deverá esclarecer</p>
            {summary.needsClarification.map((item) => (
              <p key={item} className="mt-1 text-xs leading-relaxed text-amber-800">• {item}</p>
            ))}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500" htmlFor="summary-correction">Deseja corrigir ou complementar algo?</label>
            <textarea
              id="summary-correction"
              value={summaryCorrection}
              onChange={(event) => setSummaryCorrection(event.target.value)}
              rows={3}
              placeholder="Opcional. Escreva uma correção ou informação adicional."
              className="w-full resize-none rounded-xl border-2 border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none focus:border-cyan-400"
            />
          </div>
          <PrimaryButton label="Continuar para consentimento" onClick={() => continueToSummaryConsent(summary)} />
          <button onClick={() => addAssistantMessage("O resumo ficou salvo apenas no estado local para você revisar depois.")}
            className="w-full py-2 text-sm font-semibold text-slate-500">Revisar depois</button>
        </ChatCardShell>
      );
    }

    if (widget.type === "summary-consent") {
      return (
        <ChatCardShell>
          <div className="rounded-xl bg-cyan-50 p-3">
            <p className="text-sm font-bold text-cyan-900">Consentimento para compartilhar</p>
            <p className="mt-1 text-sm leading-relaxed text-cyan-800">
              O motivo do atendimento, sintomas informados, pontos não esclarecidos e o histórico original desta conversa serão compartilhados somente com {widget.summary.professional} para a consulta {widget.summary.appointmentCode}.
            </p>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">O resumo é demonstrativo, não integra prontuário e não substitui a avaliação durante a consulta.</p>
          <PrimaryButton label="Autorizo compartilhar" onClick={() => sharePreConsultSummary(widget.summary)} />
          <button onClick={() => declineSummarySharing(widget.summary)}
            className="w-full rounded-xl border-2 border-slate-200 py-3 text-sm font-semibold text-slate-700">Não compartilhar agora</button>
        </ChatCardShell>
      );
    }

    if (widget.type === "summary-shared") {
      return (
        <ChatCardShell>
          <div className="rounded-xl bg-green-50 p-3">
            <p className="text-sm font-bold text-green-800">✓ Resumo compartilhado</p>
            <p className="mt-1 text-xs leading-relaxed text-green-700">Disponível apenas na consulta demonstrativa de {widget.summary.professional}. Compartilhamento e armazenamento são simulados.</p>
          </div>
          <p className="text-xs text-slate-500">Gerado em {widget.summary.generatedAt}</p>
        </ChatCardShell>
      );
    }

    if (widget.type === "summary-insufficient") {
      return (
        <ChatCardShell>
          <p className="text-sm font-bold text-slate-700">Resumo indisponível</p>
          <p className="text-sm leading-relaxed text-slate-500">Nenhuma queixa ou motivo de atendimento foi informado. Não criamos conteúdo por suposição.</p>
          <button onClick={() => sendMessage("Estou com um sintoma")}
            className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white">Descrever minha necessidade</button>
        </ChatCardShell>
      );
    }

    if (widget.type === "appointments") {
      return (
        <div className="mt-2 w-full space-y-2">
          {widget.appointments.map((appointment) => (
            <div key={appointment.id} className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-bold text-slate-800">{appointment.specialty}</p>
                  <p className="text-xs text-slate-500">{appointment.doctor}</p>
                </div>
                <span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">{appointment.status}</span>
              </div>
              <p className="mt-2 text-xs text-slate-500">{appointment.clinic}</p>
              <p className="mt-1 text-xs font-semibold text-cyan-700">{appointment.modality === "Telemedicina" ? "▣ Telemedicina" : "🏥 Presencial"}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">📅 {appointment.date} · ⏰ {appointment.time}</p>
              <div className="mt-3 grid grid-cols-3 gap-1.5">
                <button onClick={() => showAppointmentDetails(appointment)} className="rounded-lg bg-slate-50 py-2 text-xs font-semibold text-slate-600">Detalhes</button>
                <button onClick={() => addAssistantMessage("Escolha um novo horário.", undefined, "default", {
                  type: "slots",
                  appointmentId: appointment.id,
                  draft: {
                    specialty: appointment.specialty,
                    clinic: appointment.clinic,
                    doctor: appointment.doctor,
                    date: appointment.date,
                    dayReference: appointment.dayReference,
                    time: appointment.time,
                  },
                })} className="rounded-lg bg-cyan-50 py-2 text-xs font-semibold text-cyan-700">Remarcar</button>
                <button onClick={() => addAssistantMessage("Confirme se deseja cancelar esta consulta.", undefined, "default", {
                  type: "cancel-review",
                  appointment,
                })} className="rounded-lg bg-red-50 py-2 text-xs font-semibold text-red-600">Cancelar</button>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (widget.type === "reschedule-review") {
      return (
        <ChatCardShell>
          <p className="text-sm font-bold text-slate-800">Confirmar novo horário</p>
          <DetailRows appointment={widget.draft} />
          <PrimaryButton label="Confirmar remarcação" onClick={() => confirmReschedule(widget.appointment, widget.draft)} />
          <button onClick={() => addAssistantMessage("Escolha outro horário.", undefined, "default", {
            type: "slots",
            draft: widget.draft,
            appointmentId: widget.appointment.id,
          })} className="w-full py-2 text-sm font-semibold text-slate-500">Escolher outro horário</button>
        </ChatCardShell>
      );
    }

    if (widget.type === "cancel-review") {
      return (
        <ChatCardShell>
          <p className="text-sm font-bold text-red-700">Confirmar cancelamento</p>
          <DetailRows appointment={widget.appointment} />
          <button onClick={() => confirmCancellation(widget.appointment)} className="w-full rounded-2xl bg-red-500 px-4 py-3.5 text-base font-bold text-white">Confirmar cancelamento</button>
          <button onClick={() => addAssistantMessage("Tudo bem. A consulta foi mantida e nenhuma alteração foi feita.")}
            className="w-full rounded-xl border-2 border-slate-200 py-3 text-sm font-semibold text-slate-700">Manter consulta</button>
        </ChatCardShell>
      );
    }

    return (
      <ChatCardShell>
        <p className="text-sm font-bold text-slate-700">{widget.title}</p>
        <p className="text-sm leading-relaxed text-slate-500">{widget.description}</p>
        <button onClick={() => startBooking()} className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white">Agendar consulta</button>
      </ChatCardShell>
    );
  };

  const restartConversation = () => {
    setMessages([CHAT_INITIAL_MESSAGE]);
    setInput("");
    setIsProcessing(false);
    setIsListening(false);
    setLastFailedMessage("");
    setTask("idle");
    setBookingDraft({ specialty: "", clinic: "", doctor: "", date: "", dayReference: "", time: "" });
    setTimePreference("any");
    setSymptomSummaryInput({ chiefComplaint: "", description: "", duration: "", intensity: "", associatedSymptoms: "" });
    setSummaryCorrection("");
    setShowRestart(false);
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <div className="border-b border-slate-100 bg-white px-4 pb-3 pt-2">
        <div className="flex items-center gap-3">
          <button
            onClick={() => go("triage-intro")}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"
            aria-label="Voltar para introdução da pré-triagem"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M12 4L6 10L12 16" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-bold text-slate-800">Assistente Consulta Fácil</h1>
            <p className="text-sm text-cyan-700">Assistente virtual · tarefas no chat</p>
          </div>
          <button
            onClick={() => setShowRestart(true)}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"
            aria-label="Reiniciar conversa"
          >
            <svg width="19" height="19" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 6V2M4 2H8M4 2l2.5 2.5A7 7 0 1110 17" />
            </svg>
          </button>
        </div>
      </div>

      <div
        ref={conversationRef}
        className="no-scrollbar flex-1 space-y-5 overflow-y-auto px-4 py-5"
        aria-live="polite"
      >
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-2.5 ${message.sender === "patient" ? "justify-end" : "items-start"}`}>
            {message.sender === "assistant" && (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white shadow-sm" aria-hidden="true">
                <AppLogo size={24} light />
              </div>
            )}
            <div className={`max-w-[82%] ${message.sender === "patient" ? "items-end" : "items-start"} flex flex-col`}>
              <div className={`rounded-2xl px-4 py-3.5 shadow-sm ${
                message.sender === "patient"
                  ? "rounded-br-md bg-cyan-500 text-white"
                  : message.tone === "urgent"
                    ? "rounded-bl-md border-2 border-amber-300 bg-amber-50 text-amber-900"
                    : message.tone === "error"
                      ? "rounded-bl-md border-2 border-red-200 bg-red-50 text-red-800"
                      : "rounded-bl-md border border-slate-100 bg-white text-slate-700"
              }`}>
                {message.tone === "urgent" && <p className="mb-1.5 text-sm font-bold">Atenção: procure ajuda se houver sinais graves</p>}
                {message.tone === "error" && <p className="mb-1.5 text-sm font-bold">Mensagem não processada</p>}
                <p className="text-base leading-relaxed">{message.text}</p>
              </div>
              <span className="mt-1 px-1 text-xs text-slate-400">{message.time}</span>
              {message.actions && (
                <div className="mt-2 flex w-full flex-wrap gap-2">
                  {message.actions.map((action) => (
                    <button
                      key={`${message.id}-${action.label}`}
                      onClick={() => handleAction(action)}
                      disabled={isProcessing}
                      className={`min-h-11 rounded-xl border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-600 ${
                        message.tone === "urgent"
                          ? "border-amber-300 bg-white text-amber-800"
                          : message.tone === "error"
                            ? "border-red-200 bg-white text-red-700"
                            : "border-cyan-200 bg-white text-cyan-700 hover:bg-cyan-50"
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
              {message.widget && renderWidget(message.widget)}
            </div>
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-start gap-2.5" role="status">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white">
              <AppLogo size={24} light />
            </div>
            <div className="rounded-2xl rounded-bl-md border border-slate-100 bg-white px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 [animation-delay:300ms]" />
                <span className="ml-1 text-sm text-slate-500">Preparando orientação...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 bg-white px-4 pb-5 pt-3">
        <p className="mb-3 text-center text-xs leading-relaxed text-slate-500">
          Operações, respostas e áudio são simulados neste protótipo. A orientação não substitui avaliação profissional.
        </p>
        {isListening && (
          <div className="mb-2 flex items-center justify-center gap-2 rounded-xl bg-cyan-50 py-2 text-sm font-semibold text-cyan-700" role="status">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
            Ouvindo... áudio simulado no protótipo
          </div>
        )}
        <div className="flex items-end gap-2">
          <button
            onClick={startAudioSimulation}
            disabled={isProcessing || isListening}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border-2 border-cyan-200 bg-cyan-50 text-cyan-700 disabled:opacity-40"
            aria-label={isListening ? "Ouvindo mensagem de áudio" : "Falar mensagem por áudio"}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <rect x="8" y="3" width="8" height="13" rx="4" />
              <path d="M5 11a7 7 0 0014 0M12 18v3M9 21h6" />
            </svg>
          </button>
          <label className="sr-only" htmlFor="health-chat-input">Digite como podemos ajudar</label>
          <textarea
            id="health-chat-input"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            placeholder="Digite como podemos ajudar..."
            className="min-h-12 flex-1 resize-none rounded-xl border-2 border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-700 outline-none placeholder:text-slate-400 focus:border-cyan-400 focus:bg-white"
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isProcessing}
            className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-white transition-colors hover:bg-cyan-600 disabled:bg-slate-200 disabled:text-slate-400"
            aria-label="Enviar mensagem"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </button>
        </div>
        {lastFailedMessage && <p className="mt-2 text-center text-xs text-red-600">Sua mensagem foi mantida para uma nova tentativa.</p>}
      </div>

      {showRestart && (
        <ConfirmSheet
          title="Reiniciar conversa?"
          desc="As mensagens exibidas serão apagadas e você voltará ao início da orientação."
          confirmLabel="Reiniciar conversa"
          danger
          onConfirm={restartConversation}
          onCancel={() => setShowRestart(false)}
        />
      )}
    </div>
  );
}

function TriageQ1Screen({ go, onAnswer }: { go: Nav; onAnswer: (key: string, val: string) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const options = [
    { value: "dor", label: "Dor", icon: "😣" },
    { value: "febre", label: "Febre", icon: "🌡️" },
    { value: "tosse", label: "Tosse", icon: "😮‍💨" },
    { value: "cansaço", label: "Cansaço excessivo", icon: "😴" },
    { value: "pele", label: "Alteração na pele", icon: "🔍" },
    { value: "falta_ar", label: "Falta de ar", icon: "🫁" },
    { value: "tontura", label: "Tontura / desmaio", icon: "💫" },
    { value: "outro", label: "Outro sintoma", icon: "💬" },
  ];

  const toggle = (val: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(val)) next.delete(val); else next.add(val);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Pré-triagem" onBack={() => go("triage-intro")} />
      <ProgressBar current={1} total={5} />
      <div className="flex-1 px-5 overflow-y-auto no-scrollbar">
        <h2 className="text-xl font-bold text-slate-800 mb-1">O que você está sentindo?</h2>
        <p className="text-sm text-slate-400 mb-4">Selecione um ou mais sintomas</p>
        <div className="space-y-2.5">
          {options.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              selected={selected.has(opt.value)}
              onClick={() => toggle(opt.value)}
            />
          ))}
        </div>
      </div>
      <div className="px-5 pb-8 pt-4">
        {selected.size > 0 && (
          <p className="text-xs text-cyan-600 font-medium mb-2 text-center">
            {selected.size} {selected.size === 1 ? "sintoma selecionado" : "sintomas selecionados"}
          </p>
        )}
        <PrimaryButton
          label="Continuar"
          onClick={() => { if (selected.size > 0) { onAnswer("symptom", Array.from(selected).join(",")); go("triage-q2"); } }}
          disabled={selected.size === 0}
        />
      </div>
    </div>
  );
}

function TriageQ2Screen({ go, onAnswer }: { go: Nav; onAnswer: (key: string, val: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = [
    { value: "cabeca", label: "Cabeça / pescoço", icon: "🧠" },
    { value: "peito", label: "Peito / tórax", icon: "🫀" },
    { value: "abdomen", label: "Abdômen", icon: "🫃" },
    { value: "membros", label: "Braços / pernas", icon: "🦵" },
    { value: "costas", label: "Costas", icon: "🦴" },
    { value: "pele", label: "Pele (todo o corpo)", icon: "✋" },
    { value: "nao_sei", label: "Não tenho certeza", icon: "❓" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Pré-triagem" onBack={() => go("triage-q1")} />
      <ProgressBar current={2} total={5} />
      <div className="flex-1 px-5 overflow-y-auto no-scrollbar">
        <h2 className="text-xl font-bold text-slate-800 mb-5">Em qual parte do corpo você sente o problema?</h2>
        <div className="space-y-2.5">
          {options.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              selected={selected === opt.value}
              onClick={() => setSelected(opt.value)}
            />
          ))}
        </div>
      </div>
      <div className="px-5 pb-8 pt-4">
        <PrimaryButton
          label="Continuar"
          onClick={() => { if (selected) { onAnswer("location", selected); go("triage-q3"); } }}
          disabled={!selected}
        />
      </div>
    </div>
  );
}

function TriageQ3Screen({ go, onAnswer }: { go: Nav; onAnswer: (key: string, val: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  const options = [
    { value: "hoje", label: "Hoje", icon: "⚡" },
    { value: "dias", label: "Há alguns dias", icon: "📅" },
    { value: "semanas", label: "Há algumas semanas", icon: "🗓️" },
    { value: "meses", label: "Há alguns meses", icon: "📆" },
    { value: "nao_sei", label: "Não tenho certeza", icon: "❓" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Pré-triagem" onBack={() => go("triage-q2")} />
      <ProgressBar current={3} total={5} />
      <div className="flex-1 px-5 overflow-y-auto no-scrollbar">
        <h2 className="text-xl font-bold text-slate-800 mb-5">Há quanto tempo você está sentindo isso?</h2>
        <div className="space-y-2.5">
          {options.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              icon={opt.icon}
              selected={selected === opt.value}
              onClick={() => setSelected(opt.value)}
            />
          ))}
        </div>
      </div>
      <div className="px-5 pb-8 pt-4">
        <PrimaryButton
          label="Continuar"
          onClick={() => { if (selected) { onAnswer("duration", selected); go("triage-q4"); } }}
          disabled={!selected}
        />
      </div>
    </div>
  );
}

function TriageQ4Screen({ go, onAnswer }: { go: Nav; onAnswer: (key: string, val: string) => void }) {
  const [selected, setSelected] = useState<number | null>(null);
  const levels = [
    { value: 1, label: "Muito leve", color: "bg-green-100 text-green-700 border-green-200", selectedColor: "bg-green-500 text-white border-green-500", emoji: "😌" },
    { value: 2, label: "Leve", color: "bg-lime-100 text-lime-700 border-lime-200", selectedColor: "bg-lime-500 text-white border-lime-500", emoji: "🙂" },
    { value: 3, label: "Moderado", color: "bg-yellow-100 text-yellow-700 border-yellow-200", selectedColor: "bg-yellow-500 text-white border-yellow-500", emoji: "😐" },
    { value: 4, label: "Intenso", color: "bg-orange-100 text-orange-700 border-orange-200", selectedColor: "bg-orange-500 text-white border-orange-500", emoji: "😣" },
    { value: 5, label: "Muito intenso", color: "bg-red-100 text-red-700 border-red-200", selectedColor: "bg-red-500 text-white border-red-500", emoji: "😖" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Pré-triagem" onBack={() => go("triage-q3")} />
      <ProgressBar current={4} total={5} />
      <div className="flex-1 px-5 overflow-y-auto no-scrollbar">
        <h2 className="text-xl font-bold text-slate-800 mb-2">Como você classificaria o desconforto?</h2>
        <p className="text-sm text-slate-400 mb-6">Selecione o nível que melhor descreve o que você sente</p>
        <div className="space-y-2.5">
          {levels.map((level) => (
            <button
              key={level.value}
              onClick={() => setSelected(level.value)}
              className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl border-2 transition-all ${
                selected === level.value ? level.selectedColor : level.color
              }`}
            >
              <span className="text-2xl">{level.emoji}</span>
              <span className="text-base font-semibold">{level.label}</span>
              <span className="ml-auto text-sm opacity-70">{level.value}/5</span>
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pb-8 pt-4">
        <PrimaryButton
          label="Continuar"
          onClick={() => { if (selected !== null) { onAnswer("intensity", String(selected)); go("triage-q5"); } }}
          disabled={selected === null}
        />
      </div>
    </div>
  );
}

function TriageQ5Screen({ go, onAnswer }: { go: Nav; onAnswer: (key: string, val: string) => void }) {
  const [text, setText] = useState("");
  const [audioState, setAudioState] = useState<"idle" | "recording" | "transcribing" | "done">("idle");
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRec = () => {
    setAudioState("recording");
    setSeconds(0);
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopRec = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setAudioState("transcribing");
    setTimeout(() => {
      setText((prev) =>
        prev
          ? prev + " Tenho histórico de pressão alta e tomo losartana diariamente."
          : "Tenho histórico de pressão alta e tomo losartana diariamente."
      );
      setAudioState("done");
    }, 2000);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Pré-triagem" onBack={() => go("triage-q4")} />
      <ProgressBar current={5} total={5} />
      <div className="flex-1 px-5 overflow-y-auto no-scrollbar space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Gostaria de contar mais alguma coisa?</h2>
          <p className="text-sm text-slate-400">Opcional — quanto mais detalhes, melhor a orientação.</p>
        </div>

        {/* Audio capture */}
        <div className="bg-slate-50 rounded-2xl p-4">
          <p className="text-sm font-semibold text-slate-600 mb-3">Falar por áudio</p>
          {audioState === "idle" && (
            <button
              onClick={startRec}
              className="w-full flex items-center justify-center gap-3 border-2 border-cyan-200 bg-cyan-50 text-cyan-700 font-semibold py-3.5 rounded-xl hover:bg-cyan-100 transition-all"
            >
              <span className="text-xl">🎙️</span>
              <span>Toque para gravar</span>
            </button>
          )}
          {audioState === "recording" && (
            <button
              onClick={stopRec}
              className="w-full flex items-center justify-center gap-3 bg-red-500 text-white font-semibold py-3.5 rounded-xl hover:bg-red-600 transition-all"
            >
              <div className="w-4 h-4 bg-white rounded-sm" />
              <span>Parar — {fmt(seconds)}</span>
              <div className="flex gap-0.5 items-end h-4">
                {[3,5,4,6,3,5].map((h,i)=>(
                  <div key={i} className="w-1 bg-white/70 rounded-full animate-pulse" style={{height:`${h*3}px`,animationDelay:`${i*0.1}s`}}/>
                ))}
              </div>
            </button>
          )}
          {audioState === "transcribing" && (
            <div className="flex items-center justify-center gap-3 py-3.5 text-slate-500">
              <div className="flex gap-1">
                {[0,1,2].map(i=>(
                  <div key={i} className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{animationDelay:`${i*0.2}s`}}/>
                ))}
              </div>
              <span className="text-sm">Transcrevendo...</span>
            </div>
          )}
          {audioState === "done" && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 8l3.5 3.5L13 5"/></svg>
                Áudio transcrito
              </div>
              <button onClick={() => { setAudioState("idle"); }} className="text-xs text-cyan-500 font-medium">Gravar novamente</button>
            </div>
          )}
        </div>

        {/* Text field */}
        <div>
          <p className="text-sm font-semibold text-slate-600 mb-2">Ou escreva</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: tenho alergia a remédios, sou gestante, uso marca-passo..."
            rows={4}
            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3.5 text-base text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
          />
          <p className="text-right text-xs text-slate-300 mt-1">{text.length}/300</p>
        </div>
      </div>
      <div className="px-5 pb-8 pt-3">
        <PrimaryButton
          label="Continuar"
          onClick={() => { onAnswer("notes", text); go("triage-processing"); }}
        />
      </div>
    </div>
  );
}

function TriageProcessingScreen({ go, triageAnswers }: { go: Nav; triageAnswers: Record<string, string> }) {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Analisando seus sintomas...",
    "Buscando especialidades adequadas...",
    "Verificando disponibilidade...",
    "Preparando suas opções...",
  ];

  useEffect(() => {
    const intervals: ReturnType<typeof setInterval>[] = [];
    phases.forEach((_, i) => {
      intervals.push(setInterval(() => setPhase(i), i * 700));
    });
    const isEmergency =
      triageAnswers.intensity === "5" ||
      (triageAnswers.symptom?.includes("falta_ar") && triageAnswers.location === "peito") ||
      (triageAnswers.intensity === "4" && triageAnswers.symptom?.includes("dor") && triageAnswers.location === "peito");
    const t = setTimeout(() => go(isEmergency ? "triage-emergency" : "triage-result"), 3000);
    return () => { intervals.forEach(clearInterval); clearTimeout(t); };
  }, [go]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-cyan-500 to-cyan-700 items-center justify-center">
      <div className="flex flex-col items-center gap-8 px-8 text-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 bg-white/20 rounded-full animate-ping" />
          <div className="absolute inset-2 bg-white/30 rounded-full animate-ping" style={{ animationDelay: "0.3s" }} />
          <div className="relative w-24 h-24 bg-white rounded-full flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <path d="M20 8C20 8 8 14 8 22C8 28.6 13.4 34 20 34C26.6 34 32 28.6 32 22C32 14 20 8 20 8Z" fill="#06b6d4" opacity="0.2"/>
              <path d="M20 14v10M15 19h10" stroke="#06b6d4" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Estamos analisando suas respostas</h2>
          <p className="text-cyan-100">Isso pode levar alguns segundos.</p>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div
            className="h-2 bg-white rounded-full transition-all duration-700"
            style={{ width: `${((phase + 1) / phases.length) * 100}%` }}
          />
        </div>
        <p className="text-sm text-cyan-100 min-h-5 transition-all">{phases[phase]}</p>
      </div>
    </div>
  );
}

function TriageResultScreen({ go }: { go: Nav }) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <div className="bg-gradient-to-b from-cyan-500 to-cyan-600 pt-2 px-5 pb-8">
        <Header light onBack={() => go("home")} />
        <div className="text-center pt-2">
          <p className="text-cyan-100 text-sm font-medium mb-2">Resultado da orientação</p>
          <h1 className="text-2xl font-bold text-white">Encontramos um possível caminho para você</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 -mt-5">
        <div className="bg-white rounded-3xl shadow-lg p-5 mb-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Especialidade sugerida</p>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-cyan-50 rounded-2xl flex items-center justify-center text-3xl">
              🦴
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Ortopedia</h2>
              <p className="text-sm text-slate-400 mt-0.5">Medicina do aparelho locomotor</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-50">
            <p className="text-sm text-slate-600 leading-relaxed">
              Com base nas respostas fornecidas, essa pode ser uma especialidade adequada para o seu atendimento.
            </p>
          </div>
        </div>

        <Disclaimer text="Esta orientação não substitui a avaliação de um profissional de saúde. Consulte sempre um médico." />

        <div className="mt-4 bg-slate-50 rounded-2xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Suas respostas</p>
          {[
            { label: "Sintoma", value: "Dor" },
            { label: "Localização", value: "Costas" },
            { label: "Duração", value: "Há alguns dias" },
            { label: "Intensidade", value: "Moderado (3/5)" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between py-1.5 text-sm">
              <span className="text-slate-400">{item.label}</span>
              <span className="font-medium text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>

        <div className="space-y-3 mt-4 pb-8">
          <PrimaryButton label="Ver opções de atendimento" onClick={() => go("clinics")} />
          <SecondaryButton label="Escolher outra especialidade" onClick={() => go("specialty")} />
        </div>
      </div>
    </div>
  );
}

function SpecialtyScreen({ go }: { go: Nav }) {
  const [query, setQuery] = useState("");
  const specialties = [
    { icon: "🏥", label: "Clínica Geral" },
    { icon: "🫀", label: "Cardiologia" },
    { icon: "🔬", label: "Dermatologia" },
    { icon: "🦴", label: "Ortopedia" },
    { icon: "🩺", label: "Geriatria" },
    { icon: "🧠", label: "Neurologia" },
    { icon: "👁", label: "Oftalmologia" },
    { icon: "🦷", label: "Odontologia" },
    { icon: "🫁", label: "Pneumologia" },
    { icon: "👂", label: "Otorrinolaringologia" },
    { icon: "🦱", label: "Reumatologia" },
  ];

  const filtered = specialties.filter((s) =>
    s.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Especialidades" onBack={() => go("home")} />
      <div className="px-5 pb-4">
        <h2 className="text-xl font-bold text-slate-800 mb-4">Qual atendimento você procura?</h2>
        <div className="relative">
          <svg className="absolute left-3.5 top-3.5" width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round">
            <circle cx="8" cy="8" r="5.5"/>
            <path d="M13 13l3 3"/>
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar especialidade..."
            className="w-full bg-slate-50 border-2 border-slate-100 rounded-xl pl-10 pr-4 py-3 text-base text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5">
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <span className="text-4xl">🔍</span>
            <p className="text-slate-400 mt-3">Nenhuma especialidade encontrada</p>
            <p className="text-sm text-slate-300">Tente buscar por outro termo</p>
          </div>
        ) : (
          <div className="space-y-2 pb-8">
            {filtered.map((s) => (
              <button
                key={s.label}
                onClick={() => go("clinics")}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-slate-50 hover:border-cyan-100 hover:bg-cyan-50/30 transition-all"
              >
                <span className="text-2xl">{s.icon}</span>
                <span className="text-base font-medium text-slate-700 flex-1 text-left">{s.label}</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round">
                  <path d="M6 3l5 5-5 5" />
                </svg>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ClinicsScreen({ go }: { go: Nav }) {
  const clinics = [
    {
      name: "Clínica Boa Saúde",
      neighborhood: "Boa Viagem",
      specialty: "Ortopedia",
      next: "Amanhã, 09:30",
      distance: "1,2 km",
      rating: "4.8",
    },
    {
      name: "UBS Imbiribeira",
      neighborhood: "Imbiribeira",
      specialty: "Ortopedia",
      next: "Quinta-feira, 14:00",
      distance: "2,8 km",
      rating: "4.5",
    },
    {
      name: "Centro Médico Recife",
      neighborhood: "Boa Vista",
      specialty: "Ortopedia",
      next: "Sexta-feira, 10:30",
      distance: "4,1 km",
      rating: "4.7",
    },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Ortopedia" onBack={() => go("specialty")} />
      <div className="px-5 pb-3">
        <h2 className="text-xl font-bold text-slate-800">Escolha onde você quer ser atendido</h2>
        <p className="text-sm text-slate-400 mt-1">3 clínicas disponíveis na sua região</p>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-3 pb-8">
        {clinics.map((clinic) => (
          <div key={clinic.name} className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-bold text-slate-800">{clinic.name}</h3>
                <p className="text-sm text-slate-400 mt-0.5">📍 {clinic.neighborhood} · {clinic.distance}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-lg">
                  ⭐ {clinic.rating}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
              <span className="bg-cyan-50 text-cyan-600 font-medium px-2 py-0.5 rounded-lg text-xs">{clinic.specialty}</span>
              <span className="text-green-600 font-medium">🕐 {clinic.next}</span>
            </div>
            <button
              onClick={() => go("modality")}
              className="w-full bg-cyan-500 text-white font-semibold py-3 rounded-xl text-sm hover:bg-cyan-600 transition-colors"
            >
              Ver horários
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ModalityScreen({ go, onSelect }: { go: Nav; onSelect: (modality: CareModality) => void }) {
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Modalidade" onBack={() => go("clinics")} />
      <div className="flex-1 overflow-y-auto px-5 pt-3">
        <h2 className="text-xl font-bold text-slate-800">Como você prefere ser atendido?</h2>
        <p className="mt-1 text-base leading-relaxed text-slate-500">Você poderá escolher novamente em outro agendamento.</p>
        <div className="mt-5 space-y-3">
          <button onClick={() => onSelect("Telemedicina")}
            className="w-full rounded-2xl border-2 border-cyan-200 bg-cyan-50 p-5 text-left shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-2xl text-white">▣</div>
              <div>
                <p className="text-lg font-bold text-cyan-900">Telemedicina</p>
                <p className="mt-1 text-sm leading-relaxed text-cyan-800">Consulta online com profissionais que oferecem atendimento remoto.</p>
                <p className="mt-2 text-xs font-semibold text-cyan-700">Câmera e microfone podem ser testados antes.</p>
              </div>
            </div>
          </button>
          <button onClick={() => onSelect("Presencial")}
            className="w-full rounded-2xl border-2 border-slate-100 bg-white p-5 text-left shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 text-2xl">🏥</div>
              <div>
                <p className="text-lg font-bold text-slate-800">Atendimento presencial</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">Consulta realizada no endereço da clínica escolhida.</p>
              </div>
            </div>
          </button>
        </div>
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-relaxed text-amber-800">A telemedicina desta demonstração não estabelece uma videochamada real.</p>
        </div>
      </div>
    </div>
  );
}

function ProfessionalScreen({ go, modality, telemedicinePermissions }: { go: Nav; modality: CareModality; telemedicinePermissions: Record<number, boolean> }) {
  const doctors = [
    { id: 1, name: "Dr. Carlos Mendes", crm: "CRM-PE 24.501", exp: "12 anos de experiência", availability: "Amanhã disponível", online: true },
    { id: 2, name: "Dra. Ana Paula Costa", crm: "CRM-PE 31.208", exp: "8 anos de experiência", availability: "Quinta disponível", online: true },
    { id: 6, name: "Dr. Roberto Alves", crm: "CRM-PE 18.774", exp: "20 anos de experiência", availability: "Sexta disponível", online: false },
  ].filter((doctor) => modality !== "Telemedicina" || (doctor.online && telemedicinePermissions[doctor.id] !== false));

  const initials = (name: string) => name.split(" ").slice(0, 2).map((n) => n[0]).join("");
  const colors = ["bg-teal-100 text-teal-700", "bg-purple-100 text-purple-700", "bg-blue-100 text-blue-700"];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Clínica Boa Saúde" onBack={() => go("modality")} />
      <div className="px-5 pb-3">
        <h2 className="text-xl font-bold text-slate-800">Escolha o profissional</h2>
        <p className="text-sm text-slate-400 mt-1">Ortopedia · {doctors.length} profissionais · {modality}</p>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-3 pb-8">
        {doctors.map((doc, i) => (
          <button
            key={doc.name}
            onClick={() => go("date")}
            className="w-full flex gap-4 p-4 rounded-2xl border-2 border-slate-100 hover:border-cyan-200 transition-all text-left"
          >
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-bold flex-shrink-0 ${colors[i]}`}>
              {initials(doc.name)}
            </div>
            <div className="flex-1">
              <p className="font-bold text-slate-800">{doc.name}</p>
              <p className="text-xs text-slate-400 mt-0.5">{doc.crm}</p>
              <p className="text-sm text-slate-500 mt-1">{doc.exp}</p>
              <p className="text-xs text-green-600 font-medium mt-1.5">✓ {doc.availability}</p>
              <p className="mt-1 text-xs font-semibold text-cyan-700">{doc.online ? "▣ Online e presencial" : "🏥 Somente presencial"}</p>
            </div>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" className="flex-shrink-0 self-center">
              <path d="M7 4l6 6-6 6" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
}

function DateScreen({ go }: { go: Nav }) {
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const today = 12;
  const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weeks = [
    [null, null, null, 1, 2, 3, 4],
    [5, 6, 7, 8, 9, 10, 11],
    [12, 13, 14, 15, 16, 17, 18],
    [19, 20, 21, 22, 23, 24, 25],
    [26, 27, 28, 29, 30, 31, null],
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Dr. Carlos Mendes" onBack={() => go("professional")} />
      <div className="px-5 pb-3">
        <h2 className="text-xl font-bold text-slate-800">Escolha a data</h2>
        <p className="text-sm text-slate-400 mt-1">Outubro de 2025</p>
      </div>
      <div className="px-5 flex-1 overflow-y-auto no-scrollbar">
        <div className="bg-slate-50 rounded-2xl p-4 mb-4">
          <div className="grid grid-cols-7 mb-2">
            {days.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</div>
            ))}
          </div>
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7">
              {week.map((day, di) => {
                const past = day !== null && day < today;
                const isSel = selectedDate === day;
                return (
                  <button
                    key={di}
                    disabled={!day || past}
                    onClick={() => day && !past && setSelectedDate(day)}
                    className={`aspect-square flex items-center justify-center text-sm rounded-xl m-0.5 font-medium transition-all ${
                      !day ? "invisible" :
                      isSel ? "bg-cyan-500 text-white" :
                      past ? "text-slate-200 cursor-not-allowed" :
                      day === today ? "border-2 border-cyan-300 text-cyan-600" :
                      "text-slate-700 hover:bg-cyan-50"
                    }`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {selectedDate && (
          <div className="flex items-center gap-2 text-sm text-slate-500 pb-4">
            <span className="text-cyan-500">✓</span>
            <span>Data selecionada: <strong className="text-slate-700">{selectedDate} de outubro de 2025</strong></span>
          </div>
        )}
      </div>
      <div className="px-5 pb-8 pt-4">
        <PrimaryButton
          label="Ver horários disponíveis"
          onClick={() => go("time-select")}
          disabled={!selectedDate}
        />
      </div>
    </div>
  );
}

function TimeSelectScreen({ go, modality }: { go: Nav; modality: CareModality }) {
  const [selected, setSelected] = useState<string | null>(null);
  const timeSlots = [
    { time: "07:30", available: true },
    { time: "08:00", available: false },
    { time: "08:30", available: true },
    { time: "09:00", available: true },
    { time: "09:30", available: true },
    { time: "10:00", available: false },
    { time: "10:30", available: true },
    { time: "11:00", available: false },
    { time: "14:00", available: true },
    { time: "14:30", available: true },
    { time: "15:00", available: false },
    { time: "15:30", available: true },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="16 de outubro" onBack={() => go("date")} />
      <div className="px-5 pb-3">
        <h2 className="text-xl font-bold text-slate-800">Escolha o horário</h2>
        <p className="text-sm text-slate-400 mt-1">Dr. Carlos Mendes · {modality === "Telemedicina" ? "▣ Horários online" : "Clínica Boa Saúde"}</p>
      </div>
      <div className="px-5 pb-2 flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-cyan-500 inline-block" />Selecionado</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-slate-200 inline-block" />Disponível</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-slate-100 inline-block" />Indisponível</span>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5">
        <div className="grid grid-cols-3 gap-2.5 pb-8">
          {timeSlots.map((slot) => (
            <button
              key={slot.time}
              disabled={!slot.available}
              onClick={() => slot.available && setSelected(slot.time)}
              className={`py-4 rounded-xl text-base font-semibold transition-all ${
                !slot.available
                  ? "bg-slate-50 text-slate-200 cursor-not-allowed line-through"
                  : selected === slot.time
                  ? "bg-cyan-500 text-white shadow-md"
                  : "bg-white border-2 border-slate-100 text-slate-700 hover:border-cyan-300"
              }`}
            >
              {slot.time}
            </button>
          ))}
        </div>
      </div>
      <div className="px-5 pb-8 pt-4">
        <PrimaryButton
          label="Confirmar horário"
          onClick={() => go("review")}
          disabled={!selected}
        />
      </div>
    </div>
  );
}

function ReviewScreen({ go, onSuccess, modality }: { go: Nav; onSuccess: () => void; modality: CareModality }) {
  const items = [
    { label: "Especialidade", value: "Ortopedia", icon: "🦴" },
    { label: "Profissional", value: "Dr. Carlos Mendes", icon: "👨‍⚕️" },
    { label: "Clínica", value: "Clínica Boa Saúde", icon: "🏥" },
    { label: "Endereço", value: "Av. Boa Viagem, 1200 – Boa Viagem", icon: "📍" },
    { label: "Data", value: "16 de outubro de 2025", icon: "📅" },
    { label: "Horário", value: "09:30", icon: "⏰" },
    { label: "Modalidade", value: modality, icon: modality === "Telemedicina" ? "▣" : "🏥" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Revisar agendamento" onBack={() => go("time-select")} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5">
        <h2 className="text-xl font-bold text-slate-800 mb-1">Confira seu agendamento</h2>
        <p className="text-sm text-slate-400 mb-5">Verifique os dados antes de confirmar.</p>

        <div className="bg-slate-50 rounded-2xl divide-y divide-slate-100 mb-4">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700 mt-0.5">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 mb-6">
          <p className="text-sm text-blue-700 leading-relaxed">
            {modality === "Telemedicina"
              ? "▣ Entre 10 minutos antes para testar câmera, microfone e conexão. Procure um ambiente reservado."
              : "💡 Chegue com 15 minutos de antecedência e traga um documento com foto e cartão do SUS ou convênio."}
          </p>
        </div>

        <div className="space-y-3 pb-8">
          <PrimaryButton label="Confirmar agendamento" onClick={onSuccess} />
          <SecondaryButton label="Alterar dados" onClick={() => go("date")} />
        </div>
      </div>
    </div>
  );
}

function SuccessScreen({ go }: { go: Nav }) {
  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-6">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="24" cy="24" r="20" stroke="#16a34a" strokeWidth="2.5" />
            <path d="M14 24l7 7 13-14" />
          </svg>
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-800">Agendamento realizado!</h1>
          <p className="text-base text-slate-500">Sua consulta foi agendada com sucesso.</p>
        </div>
        <div className="w-full bg-slate-50 rounded-2xl divide-y divide-slate-100">
          {[
            { label: "Especialidade", value: "Ortopedia" },
            { label: "Profissional", value: "Dr. Carlos Mendes" },
            { label: "Clínica", value: "Clínica Boa Saúde" },
            { label: "Data e horário", value: "16 out · 09:30" },
          ].map((item) => (
            <div key={item.label} className="flex justify-between items-center px-4 py-3">
              <span className="text-sm text-slate-400">{item.label}</span>
              <span className="text-sm font-semibold text-slate-700">{item.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-slate-400">Você receberá uma confirmação por e-mail e SMS.</p>
      </div>
      <div className="px-6 pb-10 space-y-3">
        <PrimaryButton label="Ver agendamento" onClick={() => go("appointments")} />
        <SecondaryButton label="Voltar para o início" onClick={() => go("home")} />
      </div>
    </div>
  );
}

function AppointmentsScreen({ go, onOpenTelemedicine, telemedicineState }: { go: Nav; onOpenTelemedicine: () => void; telemedicineState: TelemedicineState }) {
  const appointments = [
    {
      specialty: "Ortopedia",
      doctor: "Dr. Carlos Mendes",
      clinic: "Clínica Boa Saúde",
      date: "16 out 2025",
      time: "09:30",
      status: telemedicineState === "completed" ? "finalizada" : "confirmado",
      icon: "🦴",
      modality: "Telemedicina" as CareModality,
    },
    {
      specialty: "Cardiologia",
      doctor: "Dra. Luciana Ferreira",
      clinic: "Centro Médico Recife",
      date: "28 out 2025",
      time: "14:00",
      status: "aguardando",
      icon: "🫀",
      modality: "Presencial" as CareModality,
    },
  ];

  const statusStyle: Record<string, string> = {
    confirmado: "text-green-700 bg-green-50",
    aguardando: "text-yellow-700 bg-yellow-50",
    cancelado: "text-red-700 bg-red-50",
    finalizada: "text-slate-600 bg-slate-100",
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <div className="bg-white">
        <StatusBar />
        <div className="px-5 py-3">
          <h1 className="text-xl font-bold text-slate-800">Meus agendamentos</h1>
          <p className="text-sm text-slate-400">Próximas consultas</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 space-y-3 pb-4">
        {appointments.length === 0 ? (
          <div className="text-center py-20">
            <span className="text-5xl">📅</span>
            <p className="text-slate-400 mt-4 font-medium">Nenhum agendamento futuro</p>
            <p className="text-sm text-slate-300 mt-1">Seus agendamentos aparecerão aqui</p>
            <button onClick={() => go("triage-intro")} className="mt-6 text-cyan-500 font-semibold text-sm">
              Agendar consulta →
            </button>
          </div>
        ) : (
          appointments.map((apt, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {apt.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-800">{apt.specialty}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg capitalize ${statusStyle[apt.status]}`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{apt.doctor}</p>
                  <p className="text-xs text-slate-400">{apt.clinic}</p>
                  <span className={`mt-1.5 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${
                    apt.modality === "Telemedicina" ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-600"
                  }`}>
                    {apt.modality === "Telemedicina" ? "▣ Telemedicina" : "🏥 Presencial"}
                  </span>
                  <div className="flex gap-3 mt-2 text-sm text-slate-600">
                    <span>📅 {apt.date}</span>
                    <span>⏰ {apt.time}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => apt.modality === "Telemedicina" ? onOpenTelemedicine() : go("appointment-detail")}
                className="mt-3 w-full py-2.5 border-2 border-slate-100 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                {apt.modality === "Telemedicina" && telemedicineState === "completed" ? "Ver pós-atendimento" : "Ver detalhes"}
              </button>
            </div>
          ))
        )}
      </div>
      <BottomNav active="appointments" go={go} />
    </div>
  );
}

function AppointmentDetailScreen({ go, onOpenTelemedicine, documents }: { go: Nav; onOpenTelemedicine: () => void; documents: MedicalDocument[] }) {
  const [showCancel, setShowCancel] = useState(false);
  const availableDocuments = documents.filter((document) => document.consultId === 1 && document.patient === "Maria Aparecida Silva" && document.status === "available");

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Detalhes" onBack={() => go("appointments")} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5">
        <div className="flex items-center gap-3 mb-5 p-4 bg-green-50 rounded-2xl">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
              <path d="M4 10l4 4 8-8"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-green-800">Consulta confirmada</p>
            <p className="text-xs text-green-600">Código: SR-2025-04817</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl divide-y divide-slate-100 mb-4">
          {[
            { label: "Especialidade", value: "Ortopedia", icon: "🦴" },
            { label: "Profissional", value: "Dr. Carlos Mendes", icon: "👨‍⚕️" },
            { label: "CRM", value: "CRM-PE 24.501", icon: "📋" },
            { label: "Clínica", value: "Clínica Boa Saúde", icon: "🏥" },
            { label: "Endereço", value: "Av. Boa Viagem, 1200 – Boa Viagem", icon: "📍" },
            { label: "Data", value: "16 de outubro de 2025", icon: "📅" },
            { label: "Horário", value: "09:30", icon: "⏰" },
            { label: "Modalidade", value: "Telemedicina", icon: "▣" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-slate-800">Documentos do atendimento</p>
              <p className="mt-1 text-xs text-slate-500">
                {availableDocuments.length > 0 ? `${availableDocuments.length} documento(s) disponível(is)` : "Nenhum documento disponibilizado"}
              </p>
            </div>
            <span className="text-2xl">📄</span>
          </div>
          <button onClick={() => go("patient-documents")}
            className="mt-3 w-full rounded-xl border-2 border-cyan-200 py-3 text-sm font-bold text-cyan-700">Ver documentos e orientações</button>
        </div>

        {showCancel && (
          <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4">
            <p className="font-semibold text-red-700 mb-1">Cancelar agendamento?</p>
            <p className="text-sm text-red-600 mb-3">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowCancel(false)} className="flex-1 py-2 border border-red-200 rounded-xl text-sm font-semibold text-red-600">
                Não cancelar
              </button>
              <button onClick={() => go("appointments")} className="flex-1 py-2 bg-red-500 rounded-xl text-sm font-semibold text-white">
                Sim, cancelar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3 pb-8">
          <PrimaryButton label="Preparar para consulta online" onClick={onOpenTelemedicine} />
          <PrimaryButton label="Reagendar" onClick={() => go("date")} />
          <SecondaryButton label="Cancelar agendamento" onClick={() => setShowCancel(true)} />
        </div>
      </div>
    </div>
  );
}

function HistoryScreen({ go }: { go: Nav }) {
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [filterMode, setFilterMode] = useState<"week" | "month" | "custom">("month");
  const [selectedWeek, setSelectedWeek] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [appliedPeriod, setAppliedPeriod] = useState({ start: "", end: "" });
  const past = [
    { specialty: "Clínica Geral", doctor: "Dr. Marcos Vieira", date: "05 ago 2025", dateValue: "2025-08-05", icon: "🏥", status: "realizado" },
    { specialty: "Dermatologia", doctor: "Dra. Fernanda Lima", date: "14 jun 2025", dateValue: "2025-06-14", icon: "🔬", status: "realizado" },
    { specialty: "Cardiologia", doctor: "Dr. Paulo Souza", date: "03 mar 2025", dateValue: "2025-03-03", icon: "🫀", status: "cancelado" },
  ];
  const filteredPast = past.filter((appointment) => (
    (!appliedPeriod.start || appointment.dateValue >= appliedPeriod.start)
    && (!appliedPeriod.end || appointment.dateValue <= appliedPeriod.end)
  ));
  const hasDateFilter = Boolean(appliedPeriod.start || appliedPeriod.end);
  const formatFilterDate = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString("pt-BR");
  const filterLabel = appliedPeriod.start && appliedPeriod.end
    ? `${formatFilterDate(appliedPeriod.start)} a ${formatFilterDate(appliedPeriod.end)}`
    : appliedPeriod.start
      ? `Desde ${formatFilterDate(appliedPeriod.start)}`
      : appliedPeriod.end
        ? `Até ${formatFilterDate(appliedPeriod.end)}`
        : "Todo o período";
  const invalidPeriod = Boolean(startDate && endDate && startDate > endDate);
  const canApplyFilter = filterMode === "week"
    ? Boolean(selectedWeek)
    : filterMode === "month"
      ? Boolean(selectedMonth)
      : Boolean((startDate || endDate) && !invalidPeriod);

  const toInputDate = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };

  const getWeekPeriod = (value: string) => {
    const [yearValue, weekValue] = value.split("-W").map(Number);
    const januaryFourth = new Date(yearValue, 0, 4);
    const monday = new Date(januaryFourth);
    monday.setDate(januaryFourth.getDate() - (januaryFourth.getDay() || 7) + 1 + (weekValue - 1) * 7);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { start: toInputDate(monday), end: toInputDate(sunday) };
  };

  const getMonthPeriod = (value: string) => {
    const [year, month] = value.split("-").map(Number);
    return {
      start: `${value}-01`,
      end: toInputDate(new Date(year, month, 0)),
    };
  };

  const clearDateFilter = () => {
    setSelectedWeek("");
    setSelectedMonth("");
    setStartDate("");
    setEndDate("");
    setAppliedPeriod({ start: "", end: "" });
  };

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <div className="bg-white">
        <StatusBar />
        <div className="px-5 py-3">
          <h1 className="text-xl font-bold text-slate-800">Histórico</h1>
          <p className="text-sm text-slate-400">Consultas anteriores</p>
        </div>
      </div>
      <div className="flex items-center gap-2 px-5 pt-4">
        <button
          onClick={() => setShowDateFilter(true)}
          className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border px-3.5 py-3 text-left shadow-sm transition-colors ${
            hasDateFilter ? "border-cyan-200 bg-cyan-50" : "border-slate-100 bg-white"
          }`}
        >
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${hasDateFilter ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-500"}`}>
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3.5" width="13" height="11.5" rx="2" /><path d="M5 2v3M12 2v3M2 7h13" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium text-slate-400">Período selecionado</span>
            <span className={`block truncate text-base font-semibold ${hasDateFilter ? "text-cyan-700" : "text-slate-700"}`}>{filterLabel}</span>
          </span>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round">
            <path d="M5 2.5l5 5-5 5" />
          </svg>
        </button>
        {hasDateFilter && (
          <button onClick={clearDateFilter} className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-white text-slate-400 shadow-sm" aria-label="Limpar filtro">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 3l10 10M13 3L3 13" />
            </svg>
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-3 space-y-3 pb-4">
        {filteredPast.length > 0 ? (
          filteredPast.map((apt, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 opacity-80">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {apt.icon}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="font-bold text-slate-700">{apt.specialty}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${
                      apt.status === "realizado" ? "text-slate-500 bg-slate-100" : "text-red-600 bg-red-50"
                    }`}>
                      {apt.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-400">{apt.doctor}</p>
                  <p className="text-xs text-slate-300 mt-1">📅 {apt.date}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white px-6 py-12 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
              <svg width="23" height="23" viewBox="0 0 23 23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="17" height="15" rx="2" /><path d="M7 3v4M16 3v4M3 9h17M8 13l7 4M15 13l-7 4" />
              </svg>
            </div>
            <p className="mt-3 font-semibold text-slate-600">Nenhuma consulta encontrada</p>
            <p className="mt-1 text-sm text-slate-400">Tente selecionar outro período.</p>
            <button onClick={clearDateFilter} className="mt-4 text-sm font-semibold text-cyan-500">Limpar filtro</button>
          </div>
        )}
      </div>
      <BottomNav active="history" go={go} />
      {showDateFilter && (
        <div className="absolute inset-0 z-50 flex items-end bg-slate-900/40">
          <div className="w-full rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-800">Filtrar por data</h2>
                <p className="mt-1 text-base text-slate-500">Como você prefere procurar?</p>
              </div>
              <button onClick={() => setShowDateFilter(false)} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-label="Fechar">
                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M2 2l11 11M13 2L2 13" />
                </svg>
              </button>
            </div>
            <div className="mb-5 grid grid-cols-3 gap-2">
              {([
                ["week", "Semana"],
                ["month", "Mês"],
                ["custom", "Datas"],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  onClick={() => setFilterMode(mode)}
                  className={`min-h-12 rounded-xl border-2 px-2 py-3 text-sm font-bold transition-colors ${
                    filterMode === mode ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-100 bg-white text-slate-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {filterMode === "week" && (
              <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                <label className="mb-2 block text-base font-semibold text-slate-700">Escolha uma semana</label>
                <p className="mb-3 text-sm leading-relaxed text-slate-500">Você verá as consultas de segunda-feira até domingo.</p>
                <input
                  type="week"
                  value={selectedWeek}
                  onChange={(event) => setSelectedWeek(event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-700 outline-none transition-colors focus:border-cyan-400"
                />
              </div>
            )}

            {filterMode === "month" && (
              <div className="mb-5 rounded-2xl bg-slate-50 p-4">
                <label className="mb-2 block text-base font-semibold text-slate-700">Escolha um mês</label>
                <p className="mb-3 text-sm leading-relaxed text-slate-500">Você verá todas as consultas realizadas naquele mês.</p>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(event) => setSelectedMonth(event.target.value)}
                  className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-700 outline-none transition-colors focus:border-cyan-400"
                />
              </div>
            )}

            {filterMode === "custom" && (
              <div className="mb-5 space-y-4 rounded-2xl bg-slate-50 p-4">
                <div>
                  <label className="mb-2 block text-base font-semibold text-slate-700">Data inicial</label>
                  <input
                    type="date"
                    value={startDate}
                    max={endDate || undefined}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-700 outline-none transition-colors focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-base font-semibold text-slate-700">Data final</label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate || undefined}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-xl border-2 border-slate-200 bg-white px-4 py-3.5 text-base text-slate-700 outline-none transition-colors focus:border-cyan-400"
                  />
                </div>
              </div>
            )}

            {invalidPeriod && filterMode === "custom" && <p className="mb-3 text-center text-sm font-medium text-red-500">A data inicial deve ser anterior à data final.</p>}
            <div className="space-y-2.5">
              <PrimaryButton
                label="Ver consultas"
                disabled={!canApplyFilter}
                onClick={() => {
                  const nextPeriod = filterMode === "week"
                    ? getWeekPeriod(selectedWeek)
                    : filterMode === "month"
                      ? getMonthPeriod(selectedMonth)
                      : { start: startDate, end: endDate };
                  setAppliedPeriod(nextPeriod);
                  setShowDateFilter(false);
                }}
              />
              {(selectedWeek || selectedMonth || startDate || endDate || hasDateFilter) && (
                <button
                  onClick={() => {
                    clearDateFilter();
                    setShowDateFilter(false);
                  }}
                  className="w-full py-2 text-sm font-semibold text-slate-400"
                >
                  Exibir todo o histórico
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function NotificationsScreen({ go, backTo, hasDocumentNotification }: { go: Nav; backTo: Screen; hasDocumentNotification: boolean }) {
  const notifs = [
    ...(hasDocumentNotification ? [{
      title: "Novo documento disponível",
      body: "Um novo documento está disponível em uma de suas consultas.",
      time: "Agora",
      icon: "📄",
      read: false,
      target: "patient-documents" as Screen,
    }] : []),
    { title: "Consulta confirmada", body: "Seu agendamento com Dr. Carlos Mendes foi confirmado.", time: "Agora", icon: "✅", read: false },
    { title: "Lembrete de consulta", body: "Sua consulta está marcada para amanhã às 09:30.", time: "1h atrás", icon: "🔔", read: false },
    { title: "Agendamento cancelado", body: "Seu agendamento com Dr. Paulo Souza foi cancelado.", time: "2 dias atrás", icon: "❌", read: true },
    { title: "Resultado disponível", body: "O resumo da sua última consulta está disponível.", time: "1 semana atrás", icon: "📋", read: true },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Notificações" onBack={() => go(backTo)} />
      <div className="flex-1 overflow-y-auto no-scrollbar divide-y divide-slate-50">
        {notifs.map((n, i) => (
          <button key={i} onClick={() => "target" in n && n.target ? go(n.target) : undefined}
            className={`flex w-full gap-3 px-5 py-4 text-left ${n.read ? "opacity-60" : ""}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${n.read ? "bg-slate-100" : "bg-cyan-50"}`}>
              {n.icon}
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <p className={`text-sm font-semibold ${n.read ? "text-slate-500" : "text-slate-800"}`}>{n.title}</p>
                {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0 mt-1" />}
              </div>
              <p className="text-sm text-slate-400 mt-0.5 leading-snug">{n.body}</p>
              <p className="text-xs text-slate-300 mt-1">{n.time}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

type PatientProfilePanel = "edit" | "privacy" | "accessibility" | "settings" | "help";
type PatientProfileData = { name: string; email: string; phone: string; birth: string };

function ProfileToggle({ label, sub, enabled, onChange, disabled = false }: {
  label: string; sub: string; enabled: boolean; onChange: () => void; disabled?: boolean;
}) {
  return (
    <button onClick={onChange} disabled={disabled} className="flex w-full items-center gap-3 py-3 text-left disabled:opacity-50">
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-slate-400">{sub}</p>
      </div>
      <span className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${enabled ? "bg-cyan-500" : "bg-slate-200"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${enabled ? "left-6" : "left-1"}`} />
      </span>
    </button>
  );
}

function PatientProfileSheet({ panel, profile, accessibility, onClose, onProfileChange, onAccessibilityChange, onSaved }: {
  panel: PatientProfilePanel;
  profile: PatientProfileData;
  accessibility: AccessibilityPreferences;
  onClose: () => void;
  onProfileChange: (profile: PatientProfileData) => void;
  onAccessibilityChange: (preferences: AccessibilityPreferences) => void;
  onSaved: (message: string, sub: string) => void;
}) {
  const [form, setForm] = useState(profile);
  const [biometrics, setBiometrics] = useState(hasStoredBiometricCredential);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [biometricMessage, setBiometricMessage] = useState("");
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [largeText, setLargeText] = useState(accessibility.largeText);
  const [highContrast, setHighContrast] = useState(accessibility.highContrast);
  const [dataSaver, setDataSaver] = useState(false);
  const [appointmentReminder, setAppointmentReminder] = useState("1 dia antes");

  const titles: Record<PatientProfilePanel, string> = {
    edit: "Editar dados pessoais",
    privacy: "Privacidade e segurança",
    accessibility: "Acessibilidade",
    settings: "Configurações",
    help: "Ajuda e instruções",
  };

  const savePreferences = (message: string) => onSaved(message, "Suas preferências foram atualizadas com sucesso.");

  useEffect(() => {
    supportsBiometricAuthentication().then(setBiometricSupported);
  }, []);

  const toggleBiometrics = async () => {
    setBiometricMessage("");
    if (biometrics) {
      localStorage.removeItem(BIOMETRIC_CREDENTIAL_KEY);
      setBiometrics(false);
      setBiometricMessage("A entrada por biometria foi desativada neste aparelho.");
      return;
    }

    setBiometricLoading(true);
    try {
      await registerBiometricCredential();
      setBiometrics(true);
      setBiometricMessage("Biometria ativada. Agora você pode usá-la na tela de entrada.");
    } catch (error) {
      setBiometricMessage(biometricErrorMessage(error));
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-slate-900/40">
      <div className="max-h-[88%] w-full overflow-y-auto rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl no-scrollbar">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-slate-800">{titles[panel]}</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-label="Fechar">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l11 11M13 2L2 13" />
            </svg>
          </button>
        </div>

        {panel === "edit" && (
          <div className="space-y-3">
            <FormField label="Nome completo" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} />
            <FormField label="E-mail" value={form.email} onChange={(value) => setForm((prev) => ({ ...prev, email: value }))} type="email" />
            <FormField label="Telefone" value={form.phone} onChange={(value) => setForm((prev) => ({ ...prev, phone: value }))} type="tel" />
            <FormField label="Data de nascimento" value={form.birth} onChange={(value) => setForm((prev) => ({ ...prev, birth: value }))} type="date" />
            <div className="pt-2">
              <PrimaryButton
                label="Salvar alterações"
                disabled={!form.name || !form.email || !form.phone || !form.birth}
                onClick={() => {
                  onProfileChange(form);
                  onSaved("Dados atualizados!", "Suas informações pessoais foram salvas.");
                }}
              />
            </div>
          </div>
        )}

        {panel === "privacy" && (
          <div>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
              <ProfileToggle
                label={biometricLoading ? "Confirmando biometria..." : "Acesso com biometria"}
                sub={biometricSupported ? "Use a digital, o rosto ou o desbloqueio seguro deste aparelho para entrar." : "Este aparelho ou navegador não oferece autenticação biométrica."}
                enabled={biometrics}
                disabled={!biometricSupported || biometricLoading}
                onChange={toggleBiometrics}
              />
              <ProfileToggle label="Alertas de novo acesso" sub="Receba um aviso quando sua conta for acessada." enabled={loginAlerts} onChange={() => setLoginAlerts((value) => !value)} />
            </div>
            {biometricMessage && (
              <p className={`mt-3 rounded-xl px-3 py-2.5 text-sm leading-relaxed ${biometrics ? "bg-green-50 text-green-700" : "bg-slate-50 text-slate-600"}`}>
                {biometricMessage}
              </p>
            )}
            <button
              onClick={() => onSaved("Link enviado!", "Enviamos as instruções de alteração de senha para seu e-mail.")}
              className="my-4 w-full rounded-2xl border-2 border-cyan-100 py-3.5 text-sm font-semibold text-cyan-600"
            >
              Alterar minha senha
            </button>
            <PrimaryButton label="Salvar preferências" onClick={() => savePreferences("Segurança atualizada!")} />
          </div>
        )}

        {panel === "accessibility" && (
          <div>
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 px-4">
              <ProfileToggle label="Texto ampliado" sub="Aumenta o tamanho dos textos principais." enabled={largeText} onChange={() => setLargeText((value) => !value)} />
              <ProfileToggle label="Alto contraste" sub="Destaca textos e elementos interativos." enabled={highContrast} onChange={() => setHighContrast((value) => !value)} />
            </div>
            <div className="mt-5">
              <PrimaryButton
                label="Aplicar acessibilidade"
                onClick={() => {
                  onAccessibilityChange({ largeText, highContrast });
                  savePreferences("Acessibilidade atualizada!");
                }}
              />
            </div>
          </div>
        )}

        {panel === "settings" && (
          <div className="space-y-4">
            <FormSelect
              label="Lembrete de consulta"
              value={appointmentReminder}
              onChange={setAppointmentReminder}
              options={["1 hora antes", "3 horas antes", "1 dia antes", "2 dias antes"]}
            />
            <div className="rounded-2xl border border-slate-100 px-4">
              <ProfileToggle label="Economia de dados" sub="Reduz o uso de internet móvel no aplicativo." enabled={dataSaver} onChange={() => setDataSaver((value) => !value)} />
            </div>
            <PrimaryButton label="Salvar configurações" onClick={() => savePreferences("Configurações salvas!")} />
          </div>
        )}

        {panel === "help" && (
          <div className="space-y-4">
            <div className="rounded-2xl bg-cyan-50 p-4">
              <p className="font-bold text-cyan-800">Como usar o Consulta Fácil</p>
              <p className="mt-1 text-sm leading-relaxed text-cyan-700">Siga os passos abaixo. As instruções ficam sempre disponíveis nesta tela.</p>
            </div>
            {[
              {
                title: "Agendar uma consulta",
                steps: ["Na tela Início, toque em Agendar consulta.", "Responda à pré-triagem com calma.", "Escolha clínica, profissional, data e horário.", "Revise os dados e confirme o agendamento."],
              },
              {
                title: "Ver ou cancelar um agendamento",
                steps: ["Abra Agendamentos no menu inferior.", "Toque na consulta que deseja consultar.", "Confira os detalhes ou use a opção de cancelamento."],
              },
              {
                title: "Usar a pré-triagem por áudio",
                steps: ["Na pré-triagem, escolha Responder por áudio.", "Toque no microfone e fale perto do aparelho.", "Revise o texto identificado antes de continuar."],
              },
            ].map((guide) => (
              <div key={guide.title} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="mb-3 font-bold text-slate-800">{guide.title}</p>
                <div className="space-y-3">
                  {guide.steps.map((step, index) => (
                    <div key={step} className="flex items-start gap-3">
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-cyan-100 text-sm font-bold text-cyan-700">{index + 1}</span>
                      <p className="pt-1 text-sm leading-relaxed text-slate-600">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-800">Dica de segurança</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-700">Nunca compartilhe sua senha. Seus dados são usados somente para organizar e viabilizar seu atendimento.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileScreen({ go, accessibility, onAccessibilityChange }: {
  go: Nav;
  accessibility: AccessibilityPreferences;
  onAccessibilityChange: (preferences: AccessibilityPreferences) => void;
}) {
  const [activePanel, setActivePanel] = useState<PatientProfilePanel | null>(null);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [toast, setToast] = useState<{ message: string; sub: string } | null>(null);
  const [profile, setProfile] = useState<PatientProfileData>({
    name: "Maria Aparecida Silva",
    email: "maria@email.com",
    phone: "(81) 99999-0000",
    birth: "1988-05-12",
  });
  const menuItems = [
    { label: "Editar dados pessoais", icon: "✏️", action: () => setActivePanel("edit" as PatientProfilePanel) },
    { label: "Documentos e orientações", icon: "📄", action: () => go("patient-documents") },
    { label: "Privacidade e segurança", icon: "🔒", action: () => setActivePanel("privacy" as PatientProfilePanel) },
    { label: "Acessibilidade", icon: "♿", action: () => setActivePanel("accessibility" as PatientProfilePanel) },
    { label: "Notificações", icon: "🔔", action: () => go("notifications") },
    { label: "Configurações", icon: "⚙️", action: () => setActivePanel("settings" as PatientProfilePanel) },
    { label: "Ajuda e instruções", icon: "❓", action: () => setActivePanel("help" as PatientProfilePanel) },
  ];
  const initials = profile.name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase();

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <div className="bg-white">
        <StatusBar />
        <div className="px-5 py-4">
          <h1 className="text-xl font-bold text-slate-800">Perfil</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
        {/* Profile card */}
        <div className="mx-5 mt-4 bg-white rounded-2xl p-4 flex items-center gap-4 border border-slate-100 shadow-sm mb-4">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">
            {initials}
          </div>
          <div>
            <p className="font-bold text-slate-800">{profile.name}</p>
            <p className="text-sm text-slate-400">{profile.email}</p>
            <p className="text-sm text-slate-400">{profile.phone}</p>
          </div>
        </div>

        {/* Menu */}
        <div className="mx-5 bg-white rounded-2xl divide-y divide-slate-50 border border-slate-100 shadow-sm">
          {menuItems.map((item) => (
            <button
              key={item.label}
              onClick={item.action}
              className="w-full flex items-center gap-3 px-4 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="text-xl">{item.icon}</span>
              <span className="flex-1 text-sm font-medium text-slate-700">{item.label}</span>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round">
                <path d="M6 3l5 5-5 5" />
              </svg>
            </button>
          ))}
        </div>

        <div className="mx-5 mt-4">
          <button
            onClick={() => setLogoutConfirm(true)}
            className="w-full py-4 rounded-2xl text-red-500 border-2 border-red-100 font-semibold text-sm hover:bg-red-50 transition-colors"
          >
            Sair da conta
          </button>
        </div>

        <p className="text-center text-xs text-slate-300 mt-6">Consulta Fácil v1.0.0 · Secretaria Municipal de Saúde</p>
      </div>
      <BottomNav active="profile" go={go} />
      {activePanel && (
        <PatientProfileSheet
          panel={activePanel}
          profile={profile}
          accessibility={accessibility}
          onClose={() => setActivePanel(null)}
          onProfileChange={setProfile}
          onAccessibilityChange={onAccessibilityChange}
          onSaved={(message, sub) => {
            setActivePanel(null);
            setToast({ message, sub });
          }}
        />
      )}
      {logoutConfirm && (
        <ConfirmSheet
          title="Sair da conta?"
          desc="Você precisará entrar novamente para acessar seus agendamentos."
          confirmLabel="Sair"
          danger
          onConfirm={() => go("welcome")}
          onCancel={() => setLogoutConfirm(false)}
        />
      )}
      {toast && <Toast message={toast.message} sub={toast.sub} onClose={() => setToast(null)} />}
    </div>
  );
}

function PatientDocumentsScreen({ go, documents }: { go: Nav; documents: MedicalDocument[] }) {
  const [filter, setFilter] = useState<"Todos" | MedicalDocumentType>("Todos");
  const [selectedDocument, setSelectedDocument] = useState<MedicalDocument | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const patientDocuments = documents
    .filter((document) => document.patient === "Maria Aparecida Silva" && document.status !== "draft")
    .filter((document) => filter === "Todos" || document.type === filter)
    .sort((a, b) => b.id - a.id);

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Documentos e orientações" onBack={() => go("profile")} />
      <div className="flex gap-2 overflow-x-auto px-5 pb-3 no-scrollbar">
        {(["Todos", ...MEDICAL_DOCUMENT_TYPES] as const).map((type) => (
          <button key={type} onClick={() => setFilter(type)}
            className={`flex-shrink-0 rounded-xl px-3 py-2 text-xs font-semibold ${
              filter === type ? "bg-cyan-500 text-white" : "border border-slate-100 bg-white text-slate-500"
            }`}>{type}</button>
        ))}
      </div>
      <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto px-5 pb-8">
        <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3">
          <p className="text-xs leading-relaxed text-cyan-800">Documentos médicos são sensíveis. Neste protótipo, arquivos e downloads são apenas demonstrativos e não persistem após recarregar.</p>
        </div>
        {patientDocuments.length === 0 ? (
          <div className="rounded-2xl border border-slate-100 bg-white px-6 py-14 text-center">
            <span className="text-4xl">📄</span>
            <p className="mt-3 font-bold text-slate-700">Nenhum documento disponível</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">Os documentos disponibilizados pelo profissional aparecerão aqui.</p>
          </div>
        ) : patientDocuments.map((document) => (
          <div key={document.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-sm font-bold text-red-700">
                {document.fileFormat.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold leading-snug text-slate-800">{document.title}</p>
                  <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    document.status === "available" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
                  }`}>{document.status === "available" ? "Disponível" : "Indisponível"}</span>
                </div>
                <p className="mt-1 text-xs font-semibold text-cyan-700">{document.type}</p>
                <p className="mt-2 text-sm text-slate-500">{document.professional}</p>
                <p className="text-xs text-slate-400">{document.specialty} · {document.consultationDate}</p>
                {document.madeAvailableAt && <p className="mt-1 text-xs text-slate-400">Disponibilizado em {document.madeAvailableAt}</p>}
              </div>
            </div>
            {document.status === "available" ? (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedDocument(document)}
                  className="rounded-xl border-2 border-cyan-200 py-2.5 text-xs font-bold text-cyan-700">Visualizar documento</button>
                <button onClick={() => {
                  setDownloadingId(document.id);
                  window.setTimeout(() => {
                    setDownloadingId(null);
                    setToast("Download demonstrativo preparado. Nenhum arquivo real foi transferido.");
                  }, 700);
                }}
                  disabled={downloadingId === document.id}
                  className="rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-white disabled:opacity-60">
                  {downloadingId === document.id ? "Preparando..." : `Baixar ${document.fileFormat.toUpperCase()}`}
                </button>
              </div>
            ) : (
              <div className="mt-3 rounded-xl bg-slate-50 p-3">
                <p className="text-xs leading-relaxed text-slate-500">Arquivo temporariamente indisponível. Procure a unidade responsável se precisar de ajuda.</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedDocument && (
        <div className="absolute inset-0 z-50 flex items-end bg-slate-900/40">
          <div className="w-full rounded-t-3xl bg-white px-5 pb-10 pt-4">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-lg font-bold text-slate-800">{selectedDocument.title}</p>
                <p className="text-sm text-slate-500">{selectedDocument.type}</p>
              </div>
              <button onClick={() => setSelectedDocument(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-label="Fechar">×</button>
            </div>
            <div className="mt-4 rounded-2xl bg-slate-100 px-5 py-12 text-center">
              <p className="text-3xl font-bold text-red-600">{selectedDocument.fileFormat.toUpperCase()}</p>
              <p className="mt-2 text-sm text-slate-600">{selectedDocument.fileName}</p>
              <p className="mt-1 text-xs text-slate-400">{selectedDocument.fileSize} · versão {selectedDocument.version}</p>
              <p className="mt-4 text-xs leading-relaxed text-slate-500">Pré-visualização fictícia. O protótipo não armazena nem abre o conteúdo real do arquivo.</p>
            </div>
            {selectedDocument.description && <p className="mt-4 text-sm leading-relaxed text-slate-600">{selectedDocument.description}</p>}
          </div>
        </div>
      )}
      {toast && <Toast message="Documento preparado" sub={toast} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── New Screens ─────────────────────────────────────────────────────────────

function RInput({ label, type = "text", placeholder, value, onChange }: { label: string; type?: string; placeholder?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3.5 text-base text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors" />
    </div>
  );
}

function RegisterScreen({ go }: { go: Nav }) {
  const [showSuccess, setShowSuccess] = useState(false);

  const [pac, setPac] = useState({ name: "", cpf: "", birth: "", phone: "", email: "", password: "", confirm: "" });

  const sp = (k: keyof typeof pac) => (v: string) => setPac(p => ({ ...p, [k]: v }));

  if (showSuccess) return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50 relative">
      <StatusBar />
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-5">
        <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="20" cy="20" r="16"/><path d="M12 20l5.5 5.5L28 14"/>
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Conta criada com sucesso!</h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">Sua conta foi criada. Faça login para acessar sua área.</p>
        </div>
        <PrimaryButton label="Entrar" onClick={() => go("login")} />
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Cadastro de paciente" onBack={() => go("login")} />
      <div className="flex-1 px-5 pt-4 overflow-y-auto no-scrollbar space-y-3 pb-8">
        <p className="text-sm text-slate-400">Preencha os dados para criar sua conta.</p>

        <RInput label="Nome completo"       value={pac.name}    onChange={sp("name")}    placeholder="Maria Aparecida Silva" />
        <RInput label="CPF"                  value={pac.cpf}     onChange={sp("cpf")}     placeholder="000.000.000-00" />
        <RInput label="Data de nascimento"   value={pac.birth}   onChange={sp("birth")}   type="date" />
        <RInput label="Telefone / WhatsApp"  value={pac.phone}   onChange={sp("phone")}   type="tel" placeholder="(81) 99999-0000" />
        <RInput label="E-mail"               value={pac.email}   onChange={sp("email")}   type="email" placeholder="seu@email.com" />
        <RInput label="Senha"                value={pac.password} onChange={sp("password")} type="password" placeholder="Mínimo 8 caracteres" />
        <RInput label="Confirmar senha"      value={pac.confirm} onChange={sp("confirm")} type="password" placeholder="Repita a senha" />

        <p className="text-xs text-slate-400 leading-relaxed pt-1">
          Ao criar sua conta, você concorda com os{" "}
          <span className="text-cyan-500 font-medium">Termos de Uso</span> e a{" "}
          <span className="text-cyan-500 font-medium">Política de Privacidade</span>.
        </p>
        <PrimaryButton label="Criar conta" onClick={() => setShowSuccess(true)} />
        <div className="text-center pb-2">
          <button onClick={() => go("login")} className="text-sm text-slate-500">
            Já tenho uma conta <span className="text-cyan-500 font-semibold">Entrar</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function ForgotPasswordScreen({ go }: { go: Nav }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Recuperar acesso" onBack={() => go("login")} />
      <div className="flex-1 px-5 pt-4 flex flex-col">
        {!sent ? (
          <>
            <div className="flex-1 flex flex-col justify-center gap-6">
              <div className="w-20 h-20 bg-cyan-50 rounded-3xl flex items-center justify-center self-center">
                <span className="text-4xl">🔑</span>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-slate-800">Esqueceu sua senha?</h2>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Informe o e-mail cadastrado e enviaremos um link para criar uma nova senha.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full border-2 border-slate-100 rounded-xl px-4 py-3.5 text-base text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors"
                />
              </div>
            </div>
            <div className="pb-10 space-y-3">
              <PrimaryButton label="Enviar link de recuperação" onClick={() => setSent(true)} disabled={!email} />
              <SecondaryButton label="Voltar ao login" onClick={() => go("login")} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-6 pb-10">
            <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="20" cy="20" r="16"/>
                <path d="M12 20l5.5 5.5L28 14"/>
              </svg>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-slate-800">E-mail enviado!</h2>
              <p className="text-sm text-slate-500 leading-relaxed">
                Enviamos um link para <strong>{email}</strong>.<br />
                Verifique sua caixa de entrada e a pasta de spam.
              </p>
            </div>
            <PrimaryButton label="Voltar ao login" onClick={() => go("login")} />
          </div>
        )}
      </div>
    </div>
  );
}

type AudioState = "idle" | "recording" | "stopped";

function AudioRecordScreen({ go, onAnswer }: { go: Nav; onAnswer: (key: string, val: string) => void }) {
  const [state, setState] = useState<AudioState>("idle");
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = () => {
    setState("recording");
    setSeconds(0);
    intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    setState("stopped");
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Falar sobre o que sinto" onBack={() => go("triage-intro")} />
      <div className="flex-1 flex flex-col items-center justify-between px-6 pb-10 pt-4">
        <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center">
          {state === "idle" && (
            <>
              <p className="text-base text-slate-600 leading-relaxed max-w-xs">
                Toque no botão e fale, com suas próprias palavras, o que você está sentindo.
              </p>
              <p className="text-sm text-slate-400">Fale de forma natural. Sem pressa.</p>
            </>
          )}
          {state === "recording" && (
            <>
              <div className="text-2xl font-bold text-cyan-600 tabular-nums">{fmt(seconds)}</div>
              <p className="text-base text-slate-600">Estamos ouvindo você...</p>
              <div className="flex gap-1.5 items-end h-10">
                {[3, 6, 9, 5, 8, 4, 7, 6, 10, 5, 8, 4].map((h, i) => (
                  <div
                    key={i}
                    className="w-1.5 bg-cyan-400 rounded-full animate-pulse"
                    style={{ height: `${h * 4}px`, animationDelay: `${i * 0.1}s` }}
                  />
                ))}
              </div>
            </>
          )}
          {state === "stopped" && (
            <>
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M6 16l7 7L26 10"/>
                </svg>
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-lg">Gravação concluída</p>
                <p className="text-sm text-slate-400 mt-1">Duração: {fmt(seconds)}</p>
              </div>
            </>
          )}

          {/* Main mic button */}
          {state !== "stopped" ? (
            <button
              onClick={state === "idle" ? startRecording : stopRecording}
              className={`w-32 h-32 rounded-full flex items-center justify-center shadow-xl transition-all ${
                state === "recording"
                  ? "bg-red-500 shadow-red-200 scale-110"
                  : "bg-cyan-500 shadow-cyan-200"
              }`}
              aria-label={state === "idle" ? "Iniciar gravação" : "Parar gravação"}
            >
              {state === "idle" ? (
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="18" y="6" width="16" height="26" rx="8"/>
                  <path d="M10 28c0 8.8 7.2 16 16 16s16-7.2 16-16"/>
                  <path d="M26 44v6M20 50h12"/>
                </svg>
              ) : (
                <svg width="36" height="36" viewBox="0 0 36 36" fill="white">
                  <rect x="6" y="6" width="24" height="24" rx="4"/>
                </svg>
              )}
            </button>
          ) : null}

          <p className="text-xs text-slate-300">
            {state === "idle" ? "Toque no microfone para começar" :
             state === "recording" ? "Toque no quadrado para parar" :
             ""}
          </p>
        </div>

        {state === "stopped" && (
          <div className="w-full space-y-3">
            <PrimaryButton
              label="Continuar"
              onClick={() => {
                onAnswer("audioTranscription", "pending");
                go("audio-transcribing");
              }}
            />
            <SecondaryButton label="Gravar novamente" onClick={() => { setState("idle"); setSeconds(0); }} />
          </div>
        )}
      </div>
    </div>
  );
}

function AudioTranscribingScreen({ go }: { go: Nav }) {
  useEffect(() => {
    const t = setTimeout(() => go("audio-review"), 2500);
    return () => clearTimeout(t);
  }, [go]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50 items-center justify-center px-8 text-center gap-8">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 bg-cyan-100 rounded-full animate-ping opacity-60" />
        <div className="relative w-20 h-20 bg-cyan-50 rounded-full flex items-center justify-center">
          <svg width="36" height="36" viewBox="0 0 36 36" fill="none" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 18h4l4-8 4 16 4-10 3 6h5"/>
          </svg>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-800">Transcrevendo áudio...</h2>
        <p className="text-sm text-slate-400">Aguarde enquanto processamos o que você disse.</p>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
        ))}
      </div>
    </div>
  );
}

function AudioReviewScreen({ go, onAnswer }: { go: Nav; onAnswer: (key: string, val: string) => void }) {
  const [text, setText] = useState(
    "Estou sentindo uma dor forte nas costas há alguns dias. A dor piora quando fico muito tempo sentado ou quando me levanto de manhã. Às vezes sinto formigamento na perna direita."
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Confirmar relato" onBack={() => go("audio-record")} />
      <div className="flex-1 px-5 overflow-y-auto no-scrollbar space-y-4 pb-8">
        <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-3 py-2.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
            <path d="M3 8l3.5 3.5L13 5"/>
          </svg>
          <p className="text-sm text-green-700 font-medium">Áudio transcrito com sucesso</p>
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-800 mb-1">Confira o que entendemos</h2>
          <p className="text-sm text-slate-400 mb-4">
            Revise o texto abaixo. Você pode corrigir antes de continuar.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={6}
            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3.5 text-base text-slate-700 focus:outline-none focus:border-cyan-400 transition-colors resize-none leading-relaxed"
          />
        </div>

        <Disclaimer text="Este relato será usado apenas como orientação. Não substitui avaliação médica profissional." />

        <div className="space-y-3">
          <PrimaryButton
            label="Analisar relato"
            onClick={() => { onAnswer("audioTranscription", text); go("audio-guidance-result"); }}
            disabled={!text.trim()}
          />
          <SecondaryButton label="Gravar novamente" onClick={() => go("audio-record")} />
        </div>
      </div>
    </div>
  );
}

function AudioGuidanceResultScreen({ go, transcript }: { go: Nav; transcript: string }) {
  const suggestion = getSpecialtySuggestion(transcript);
  const specialty = CHAT_SPECIALTIES.find((item) => item.name === suggestion.specialty);
  const normalized = transcript.toLowerCase();
  const hasUrgentSignal = [
    "dor no peito", "falta de ar", "não consigo respirar", "desmaio",
    "sangramento intenso", "confusão mental",
  ].some((signal) => normalized.includes(signal));

  if (hasUrgentSignal) {
    return (
      <div className="flex h-full flex-col bg-amber-50">
        <StatusBar />
        <Header title="Orientação do relato" onBack={() => go("audio-review")} />
        <div className="flex flex-1 flex-col justify-center gap-5 px-5 pb-8">
          <div className="rounded-3xl border border-amber-200 bg-white p-5 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-2xl">!</div>
            <h1 className="mt-4 text-xl font-bold text-slate-800">Seu relato pode precisar de atenção imediata</h1>
            <p className="mt-3 text-base leading-relaxed text-slate-600">Se houver falta de ar intensa, dor forte no peito, desmaio ou piora rápida, procure um serviço de emergência. Não espere apenas por esta orientação.</p>
          </div>
          <PrimaryButton label="Ver orientação de emergência" onClick={() => go("triage-emergency")} />
          <SecondaryButton label="Revisar meu relato" onClick={() => go("audio-review")} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Orientação do relato" onBack={() => go("audio-review")} />
      <div className="no-scrollbar flex-1 overflow-y-auto px-5 pb-8">
        <div className="pt-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-cyan-50 text-3xl">✓</div>
          <h1 className="mt-4 text-2xl font-bold text-slate-800">Analisamos seu relato</h1>
          <p className="mt-2 text-base leading-relaxed text-slate-500">Esta avaliação é simulada e serve apenas para organizar o próximo passo.</p>
        </div>

        <div className="mt-5 rounded-3xl border border-cyan-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Possível especialidade de entrada</p>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-3xl">
              {specialty?.icon ?? "🩺"}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{suggestion.specialty}</p>
              <p className="text-sm text-cyan-700">Sugestão demonstrativa</p>
            </div>
          </div>
          <p className="mt-4 border-t border-slate-100 pt-4 text-base leading-relaxed text-slate-600">{suggestion.reason}</p>
        </div>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm leading-relaxed text-amber-800">Esta sugestão não é diagnóstico e deve ser confirmada por um profissional de saúde.</p>
        </div>

        <div className="mt-5 space-y-3">
          <PrimaryButton label={`Agendar em ${suggestion.specialty}`} onClick={() => go("clinics")} />
          <SecondaryButton label="Escolher outra especialidade" onClick={() => go("specialty")} />
          <button onClick={() => go("audio-review")} className="w-full py-2 text-sm font-semibold text-slate-400">Revisar o relato</button>
        </div>
      </div>
    </div>
  );
}

function EmergencyScreen({ go }: { go: Nav }) {
  const [showConfirm, setShowConfirm] = useState(false);

  return (
    <div className="flex flex-col h-full bg-amber-50 relative">
      <StatusBar />

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-3 pb-8 space-y-5">
        {/* Gentle header */}
        <div className="text-center pt-2 pb-1">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 6C16 6 8 10 8 18C8 22.4 11.6 26 16 26C20.4 26 24 22.4 24 18C24 10 16 6 16 6Z"/>
              <path d="M16 14v5M16 21.5v.5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 leading-snug">
            Vamos cuidar disso<br />com atenção
          </h1>
        </div>

        {/* Warm message card */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm">
          <p className="text-base text-slate-700 leading-relaxed mb-3">
            As informações que você compartilhou podem precisar de uma avaliação mais rápida.
          </p>
          <p className="text-base text-slate-700 leading-relaxed">
            Por segurança, recomendamos procurar atendimento de emergência. Você não precisa enfrentar isso sozinho.
          </p>
        </div>

        {/* SAMU — primary action, calm style */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-50 rounded-xl flex items-center justify-center flex-shrink-0">
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="#0891b2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4h3l1.5 4-2 1.5a10 10 0 004 4l1.5-2L17 13v3a2 2 0 01-2 2C8.5 18 4 13.5 4 6a2 2 0 012-2z"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-slate-800">SAMU — Atendimento de urgência</p>
              <p className="text-xs text-slate-400">Gratuito · 24 horas · 7 dias por semana</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirm(true)}
            className="w-full bg-cyan-500 text-white font-bold py-5 rounded-2xl text-lg flex items-center justify-center gap-3 hover:bg-cyan-600 transition-colors"
            aria-label="Ligar para o SAMU 192"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h4l2 5-2.5 2A11 11 0 0013 15l2-2.5 5 2v4a2 2 0 01-2 2C9.2 20.5 3.5 14.8 3.5 7A2 2 0 015 5v-.5L5 4z"/>
            </svg>
            <span>Ligar para o SAMU — 192</span>
          </button>
        </div>

        {/* Calm guidance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 space-y-3">
          <p className="font-semibold text-slate-700 text-base">Enquanto aguarda:</p>
          {[
            { icon: "🛋️", text: "Sente-se ou deite-se em posição confortável" },
            { icon: "📱", text: "Mantenha o telefone por perto" },
            { icon: "🤝", text: "Chame alguém de confiança para ficar com você" },
            { icon: "💊", text: "Não tome medicamentos sem orientação médica" },
          ].map((tip) => (
            <div key={tip.text} className="flex gap-3 items-start">
              <span className="text-xl flex-shrink-0 mt-0.5">{tip.icon}</span>
              <span className="text-sm text-slate-600 leading-relaxed">{tip.text}</span>
            </div>
          ))}
        </div>

        <div className="bg-amber-100/60 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-800 leading-relaxed text-center">
            Esta orientação não substitui a avaliação de um profissional de saúde. Apenas um médico pode avaliar sua situação.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <SecondaryButton label="Ver clínicas de urgência" onClick={() => go("clinics")} />
          <button onClick={() => go("home")} className="w-full text-sm text-slate-400 py-2 font-medium">
            Voltar ao início
          </button>
        </div>
      </div>

      {/* Calm SAMU confirmation sheet */}
      {showConfirm && (
        <div className="absolute inset-0 bg-slate-900/40 flex items-end z-50">
          <div className="w-full bg-white rounded-t-3xl px-6 pt-4 pb-10 space-y-5">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
            <div className="text-center space-y-3 py-2">
              <div className="w-16 h-16 bg-cyan-50 rounded-full flex items-center justify-center mx-auto">
                <svg width="32" height="32" viewBox="0 0 32 32" fill="none" stroke="#0891b2" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 5h5l2 6-3 2a14 14 0 005 5l2-3 6 2v5a3 3 0 01-3 3C10 25 7 14.5 7 8a3 3 0 013-3z"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800">Você deseja ligar para o SAMU?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Você será conectado ao número <strong>192</strong>.<br />
                A ligação é gratuita e atende 24 horas.
              </p>
            </div>
            <a
              href="tel:192"
              className="block w-full bg-cyan-500 text-white text-center font-bold py-5 rounded-2xl text-lg hover:bg-cyan-600 transition-colors"
            >
              Ligar agora — 192
            </a>
            <button
              onClick={() => setShowConfirm(false)}
              className="w-full border-2 border-slate-200 text-slate-700 font-semibold py-4 rounded-2xl hover:bg-slate-50 transition-colors text-base"
            >
              Voltar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Success Modal ───────────────────────────────────────────────────────────

function SuccessModal({ onAppointments, onHome, modality }: { onAppointments: () => void; onHome: () => void; modality: CareModality }) {
  return (
    <div className="absolute inset-0 z-50 flex items-end bg-slate-900/40">
      <div className="w-full bg-white rounded-t-3xl px-6 pt-5 pb-10 space-y-5">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="22" cy="22" r="18" stroke="#16a34a" strokeWidth="2" />
              <path d="M13 22l6 6 12-13" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Agendamento realizado!</h2>
            <p className="text-sm text-slate-500 mt-1">Sua consulta foi agendada com sucesso.</p>
          </div>
          <div className="w-full bg-slate-50 rounded-2xl divide-y divide-slate-100">
            {[
              { label: "Especialidade", value: "Ortopedia" },
              { label: "Profissional", value: "Dr. Carlos Mendes" },
              { label: "Clínica", value: "Clínica Boa Saúde" },
              { label: "Data e horário", value: "16 out · 09:30" },
              { label: "Modalidade", value: modality },
            ].map((item) => (
              <div key={item.label} className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-slate-400">{item.label}</span>
                <span className="text-sm font-semibold text-slate-700">{item.value}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            {modality === "Telemedicina"
              ? "Agendamento simulado. A sala virtual será liberada próximo do horário."
              : "Você receberá confirmação por e-mail e SMS."}
          </p>
        </div>
        <PrimaryButton label="Ver agendamento" onClick={onAppointments} />
        <SecondaryButton label="Voltar ao início" onClick={onHome} />
      </div>
    </div>
  );
}

// ─── Admin Shared ─────────────────────────────────────────────────────────────

function AdminHeader({ title, onBack, go }: { title: string; onBack?: () => void; go: Nav }) {
  return (
    <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3">
      {onBack ? (
        <button onClick={onBack} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100" aria-label="Voltar">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round"><path d="M11 4L6 9L11 14"/></svg>
        </button>
      ) : (
        <div className="w-9 h-9 bg-cyan-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <AppLogo size={22} light={true} />
        </div>
      )}
      <div className="flex-1">
        <p className="text-base font-bold text-slate-800">{title}</p>
        {!onBack && <p className="text-xs text-slate-400">Painel administrativo</p>}
      </div>
      {!onBack && (
        <button onClick={() => go("login")} className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1.5 rounded-lg">Sair</button>
      )}
    </div>
  );
}

function AdminNav({ active, go }: { active: string; go: Nav }) {
  const items: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: "admin-home", label: "Início", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L11 3L19 9.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M8 20V13h6v7"/>
      </svg>)},
    { id: "admin-clinics", label: "Clínicas", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="18" height="13" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/><path d="M11 11v4M9 13h4"/>
      </svg>)},
    { id: "admin-professionals", label: "Equipe", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="8" cy="7" r="3"/><path d="M2 19c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="16" cy="7" r="2"/><path d="M20 19c0-2.2-1.8-4-4-4"/>
      </svg>)},
    { id: "admin-specialties", label: "Especialid.", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="14" height="18" rx="2"/><path d="M8 7h6M8 11h6M8 15h4"/>
      </svg>)},
  ];
  return (
    <div className="flex items-center pt-2 pb-3 border-t border-slate-100 bg-white flex-shrink-0">
      {items.map((item) => (
        <button key={item.id} onClick={() => go(item.id)}
          className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-xl transition-colors ${active === item.id ? "text-cyan-500" : "text-slate-400"}`}>
          {item.icon}
          <span className="text-[10px] font-medium leading-none">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${active ? "text-green-700 bg-green-50" : "text-slate-400 bg-slate-100"}`}>
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

function AdminFab({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="absolute bottom-20 right-4 w-14 h-14 bg-cyan-500 text-white rounded-full shadow-lg flex items-center justify-center text-3xl hover:bg-cyan-600 transition-colors z-10"
      aria-label="Adicionar">
      +
    </button>
  );
}

type FormFieldProps = { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; };
function FormField({ label, value, onChange, type = "text", placeholder = "" }: FormFieldProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors" />
    </div>
  );
}

function FormSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-600 mb-1.5">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-cyan-400 transition-colors bg-white appearance-none">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

// ─── Admin Screens ────────────────────────────────────────────────────────────

type ReportPeriod = "7days" | "month" | "custom";

function AdminReportModal({ onClose, onDownloaded }: { onClose: () => void; onDownloaded: () => void }) {
  const today = new Date();
  const toInputDate = (date: Date) => {
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const [period, setPeriod] = useState<ReportPeriod>("month");
  const [startDate, setStartDate] = useState(toInputDate(monthStart));
  const [endDate, setEndDate] = useState(toInputDate(today));

  const selectPeriod = (nextPeriod: ReportPeriod) => {
    setPeriod(nextPeriod);
    if (nextPeriod === "7days") {
      setStartDate(toInputDate(weekStart));
      setEndDate(toInputDate(today));
    } else if (nextPeriod === "month") {
      setStartDate(toInputDate(monthStart));
      setEndDate(toInputDate(today));
    }
  };

  const formatDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR");

  const downloadReport = () => {
    const rows = [
      ["Relatório geral — Consulta Fácil"],
      ["Período", `${formatDate(startDate)} a ${formatDate(endDate)}`],
      [],
      ["Indicador", "Quantidade"],
      ["Agendamentos", "1.846"],
      ["Consultas realizadas", "1.429"],
      ["Cancelamentos", "96"],
      ["Novos pacientes", "318"],
      ["Clínicas ativas", "11"],
      ["Profissionais ativos", "44"],
      ["Especialidades disponíveis", "18"],
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `consulta-facil-relatorio-${startDate}-a-${endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    onDownloaded();
  };

  const invalidPeriod = !startDate || !endDate || startDate > endDate;

  return (
    <div className="absolute inset-0 z-50 flex items-end bg-slate-900/40">
      <div className="w-full rounded-t-3xl bg-white px-5 pb-8 pt-4 shadow-2xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Baixar relatório</h3>
            <p className="mt-1 text-sm text-slate-500">Escolha o período dos dados da plataforma.</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-label="Fechar">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M2 2l11 11M13 2L2 13" />
            </svg>
          </button>
        </div>

        <div className="mb-5 grid grid-cols-3 gap-2">
          {([
            ["7days", "7 dias"],
            ["month", "Este mês"],
            ["custom", "Personalizado"],
          ] as [ReportPeriod, string][]).map(([value, label]) => (
            <button
              key={value}
              onClick={() => selectPeriod(value)}
              className={`rounded-xl border py-2.5 text-xs font-semibold transition-colors ${
                period === value ? "border-cyan-500 bg-cyan-50 text-cyan-700" : "border-slate-200 bg-white text-slate-500"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Data inicial</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(event) => { setStartDate(event.target.value); setPeriod("custom"); }}
              className="w-full rounded-xl border-2 border-slate-100 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-cyan-400"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-500">Data final</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={toInputDate(today)}
              onChange={(event) => { setEndDate(event.target.value); setPeriod("custom"); }}
              className="w-full rounded-xl border-2 border-slate-100 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition-colors focus:border-cyan-400"
            />
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3 rounded-xl bg-slate-50 px-3.5 py-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white text-cyan-600 shadow-sm">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 2h7l3 3v11H4z" /><path d="M11 2v4h3M7 10h4M7 13h4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-700">Relatório geral da plataforma</p>
            <p className="text-xs text-slate-400">Arquivo CSV compatível com Excel e Planilhas</p>
          </div>
        </div>

        {invalidPeriod && <p className="mb-3 text-center text-xs font-medium text-red-500">Informe um período válido.</p>}
        <PrimaryButton label="Baixar relatório" onClick={downloadReport} disabled={invalidPeriod} />
      </div>
    </div>
  );
}

function AdminHomeScreen({ go }: { go: Nav }) {
  const [showReport, setShowReport] = useState(false);
  const [reportToast, setReportToast] = useState(false);
  const stats = [
    { label: "Clínicas",       value: "12",   icon: "🏥", color: "bg-cyan-50 text-cyan-600" },
    { label: "Profissionais",  value: "47",   icon: "👨‍⚕️", color: "bg-teal-50 text-teal-600" },
    { label: "Especialidades", value: "18",   icon: "🩺", color: "bg-cyan-50 text-cyan-600" },
    { label: "Usuários",       value: "1.240",icon: "👤", color: "bg-teal-50 text-teal-600" },
  ];

  const activity = [
    { icon: "🏥", text: "Nova clínica cadastrada",          sub: "Centro Médico Imbiribeira",              time: "Agora",     dot: "bg-green-400" },
    { icon: "👨‍⚕️", text: "Profissional atualizado",          sub: "Dra. Fernanda Lima — Cardiologia",       time: "2h atrás",  dot: "bg-cyan-400" },
    { icon: "📋", text: "Nova especialidade adicionada",    sub: "Reumatologia",                           time: "Ontem",     dot: "bg-cyan-400" },
    { icon: "👤", text: "Novo usuário cadastrado",          sub: "Carlos Eduardo Lima — Paciente",         time: "Ontem",     dot: "bg-green-400" },
    { icon: "🗓️", text: "Disponibilidade atualizada",       sub: "Dr. Carlos Mendes — Ortopedia",          time: "2 dias",    dot: "bg-slate-300" },
  ];

  const platform = [
    { label: "Agendamentos hoje", value: "83",  icon: "📅" },
    { label: "Consultas hoje",    value: "61",  icon: "✅" },
    { label: "Cancelamentos",     value: "4",   icon: "❌" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <AdminHeader title="Consulta Fácil" go={go} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-4 space-y-4">
        {/* Welcome */}
        <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 rounded-2xl px-5 py-4">
          <p className="text-cyan-100 text-sm font-medium">Painel administrativo</p>
          <h2 className="text-lg font-bold text-white mt-0.5">Bem-vindo, Admin</h2>
          <p className="text-cyan-200 text-xs mt-1">Plataforma operando normalmente ●</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s) => (
            <div key={s.label} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
              <div className={`w-9 h-9 rounded-xl ${s.color.split(" ")[0]} flex items-center justify-center text-lg mb-2`}>{s.icon}</div>
              <p className="text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Today summary */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Resumo de hoje</p>
          <div className="flex justify-between">
            {platform.map(p => (
              <div key={p.label} className="text-center">
                <span className="text-xl">{p.icon}</span>
                <p className="text-xl font-bold text-slate-800 mt-1">{p.value}</p>
                <p className="text-xs text-slate-400 mt-0.5">{p.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Reports */}
        <button
          onClick={() => setShowReport(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-cyan-100 bg-white p-4 text-left shadow-sm transition-colors hover:bg-cyan-50"
        >
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 2h8l4 4v14H5z" /><path d="M13 2v5h4M8 11h6M8 15h6" /><path d="M11 7v1" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-slate-800">Relatórios</p>
            <p className="mt-0.5 text-xs text-slate-400">Exporte os dados por período</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-cyan-500 text-white">
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 2v8M4.5 7.5l3 3 3-3M2 13h11" />
            </svg>
          </div>
        </button>

        {/* Recent activity */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5">Atividade recente</p>
          <div className="space-y-2">
            {activity.map((a, i) => (
              <div key={i} className="bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm flex items-start gap-3">
                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-base flex-shrink-0">{a.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 leading-snug">{a.text}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{a.sub}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full ${a.dot}`} />
                  <span className="text-xs text-slate-300">{a.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <AdminNav active="admin-home" go={go} />
      {showReport && (
        <AdminReportModal
          onClose={() => setShowReport(false)}
          onDownloaded={() => {
            setShowReport(false);
            setReportToast(true);
          }}
        />
      )}
      {reportToast && (
        <Toast
          message="Relatório baixado!"
          sub="O arquivo CSV foi gerado com o período selecionado."
          onClose={() => setReportToast(false)}
        />
      )}
    </div>
  );
}

type Clinic = { id: number; name: string; cnpj: string; neighborhood: string; address: string; phone: string; email: string; hours: string; specialties: string; active: boolean };

function AdminClinicsScreen({ go }: { go: Nav }) {
  const [clinics] = useState<Clinic[]>([
    { id: 1, name: "Clínica Boa Saúde", cnpj: "12.345.678/0001-90", neighborhood: "Boa Viagem", address: "Av. Boa Viagem, 1200", phone: "(81) 3333-1111", email: "contato@boasaude.com", hours: "07:00–19:00", specialties: "Ortopedia, Cardiologia", active: true },
    { id: 2, name: "UBS Imbiribeira", cnpj: "98.765.432/0001-11", neighborhood: "Imbiribeira", address: "Rua das Flores, 45", phone: "(81) 3333-2222", email: "ubs.imbiri@recife.pe.gov.br", hours: "07:00–17:00", specialties: "Clínica Geral, Geriatria", active: true },
    { id: 3, name: "Centro Médico Recife", cnpj: "55.444.333/0001-22", neighborhood: "Boa Vista", address: "Av. Agamenon, 500", phone: "(81) 3333-3333", email: "cmr@cmrecife.com", hours: "08:00–20:00", specialties: "Neurologia, Dermatologia", active: false },
  ]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50 relative">
      <StatusBar />
      <AdminHeader title="Clínicas" onBack={() => go("admin-home")} go={go} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-24 space-y-3">
        {clinics.map((c) => (
          <div key={c.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-bold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-400">📍 {c.neighborhood} · CNPJ {c.cnpj}</p>
              </div>
              <StatusBadge active={c.active} />
            </div>
            <div className="text-xs text-slate-500 space-y-0.5">
              <p>📞 {c.phone} · ✉️ {c.email}</p>
              <p>🕐 {c.hours}</p>
              <p>🩺 {c.specialties}</p>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => go("admin-clinic-form")}
                className="flex-1 py-2 text-xs font-semibold text-cyan-600 border border-cyan-200 rounded-xl hover:bg-cyan-50 transition-colors">Editar</button>
              <button className={`flex-1 py-2 text-xs font-semibold rounded-xl border transition-colors ${c.active ? "text-red-500 border-red-100 hover:bg-red-50" : "text-green-600 border-green-100 hover:bg-green-50"}`}>
                {c.active ? "Desativar" : "Ativar"}
              </button>
            </div>
          </div>
        ))}
      </div>
      <AdminFab onClick={() => go("admin-clinic-form")} />
      <AdminNav active="admin-clinics" go={go} />
    </div>
  );
}

function AdminClinicFormScreen({ go }: { go: Nav }) {
  const [form, setForm] = useState({ name: "", cnpj: "", address: "", neighborhood: "", phone: "", email: "", hours: "", specialties: "", status: "Ativo" });
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <AdminHeader title="Cadastrar Clínica" onBack={() => go("admin-clinics")} go={go} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-8 space-y-3">
        <FormField label="Nome da clínica" value={form.name} onChange={set("name")} placeholder="Ex: Clínica Boa Saúde" />
        <FormField label="CNPJ" value={form.cnpj} onChange={set("cnpj")} placeholder="00.000.000/0001-00" />
        <FormField label="Endereço" value={form.address} onChange={set("address")} placeholder="Rua, número" />
        <FormField label="Bairro" value={form.neighborhood} onChange={set("neighborhood")} placeholder="Ex: Boa Viagem" />
        <FormField label="Telefone" value={form.phone} onChange={set("phone")} type="tel" placeholder="(81) 0000-0000" />
        <FormField label="E-mail" value={form.email} onChange={set("email")} type="email" placeholder="contato@clinica.com" />
        <FormField label="Horário de funcionamento" value={form.hours} onChange={set("hours")} placeholder="Ex: 07:00–19:00" />
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Especialidades atendidas</label>
          <textarea value={form.specialties} onChange={(e) => set("specialties")(e.target.value)} placeholder="Ex: Ortopedia, Cardiologia, Geriatria" rows={2}
            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors resize-none" />
        </div>
        <FormSelect label="Status" value={form.status} onChange={set("status")} options={["Ativo", "Inativo"]} />
        <div className="pt-2 space-y-3">
          <PrimaryButton label="Salvar clínica" onClick={() => go("admin-clinics")} />
          <SecondaryButton label="Cancelar" onClick={() => go("admin-clinics")} />
        </div>
      </div>
    </div>
  );
}

type Professional = { id: number; name: string; cpf: string; reg: string; council: string; specialty: string; phone: string; email: string; clinic: string; active: boolean };

function AdminProfessionalsScreen({
  go,
  telemedicinePermissions,
  onTelemedicinePermissionChange,
}: {
  go: Nav;
  telemedicinePermissions: Record<number, boolean>;
  onTelemedicinePermissionChange: (professionalId: number, enabled: boolean) => void;
}) {
  const [pros] = useState<Professional[]>([
    { id: 1, name: "Dr. Carlos Mendes", cpf: "123.456.789-00", reg: "24.501", council: "CRM-PE", specialty: "Ortopedia", phone: "(81) 99111-1111", email: "carlos@boasaude.com", clinic: "Clínica Boa Saúde", active: true },
    { id: 2, name: "Dra. Ana Paula Costa", cpf: "987.654.321-00", reg: "31.208", council: "CRM-PE", specialty: "Ortopedia", phone: "(81) 99222-2222", email: "ana@boasaude.com", clinic: "Clínica Boa Saúde", active: true },
    { id: 3, name: "Dra. Luciana Ferreira", cpf: "456.789.123-00", reg: "18.774", council: "CRM-PE", specialty: "Cardiologia", phone: "(81) 99333-3333", email: "luciana@cmrecife.com", clinic: "Centro Médico Recife", active: true },
  ]);

  const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("");
  const colors = ["bg-teal-100 text-teal-700", "bg-purple-100 text-purple-700", "bg-blue-100 text-blue-700", "bg-orange-100 text-orange-700"];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50 relative">
      <StatusBar />
      <AdminHeader title="Profissionais" onBack={() => go("admin-home")} go={go} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-24 space-y-3">
        {pros.map((p, i) => (
          <div key={p.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
            <div className="flex gap-3 items-start mb-2">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${colors[i % colors.length]}`}>
                {initials(p.name)}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <p className="font-bold text-slate-800">{p.name}</p>
                  <StatusBadge active={p.active} />
                </div>
                <p className="text-xs text-slate-400">{p.council} {p.reg} · {p.specialty}</p>
                <p className="text-xs text-slate-400 mt-0.5">🏥 {p.clinic}</p>
                <span className={`mt-1.5 inline-flex rounded-lg px-2 py-1 text-xs font-semibold ${
                  telemedicinePermissions[p.id] ? "bg-cyan-50 text-cyan-700" : "bg-slate-100 text-slate-500"
                }`}>
                  {telemedicinePermissions[p.id] ? "▣ Telemedicina habilitada" : "Telemedicina desabilitada"}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-500 space-y-0.5 mb-3">
              <p>📞 {p.phone} · ✉️ {p.email}</p>
              <p>CPF {p.cpf}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => go("admin-professional-form")} className="flex-1 py-2 text-xs font-semibold text-cyan-600 border border-cyan-200 rounded-xl hover:bg-cyan-50 transition-colors">Editar</button>
              <button onClick={() => go("admin-availability")} className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">Disponibilidade</button>
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 p-3">
              <div>
                <p className="text-sm font-semibold text-slate-700">Permissão para telemedicina</p>
                <p className="text-xs text-slate-400">Definida exclusivamente pelo administrador</p>
              </div>
              <button
                onClick={() => onTelemedicinePermissionChange(p.id, !telemedicinePermissions[p.id])}
                className={`relative h-7 w-12 flex-shrink-0 rounded-full transition-colors ${telemedicinePermissions[p.id] ? "bg-cyan-500" : "bg-slate-300"}`}
                aria-label={telemedicinePermissions[p.id] ? `Desabilitar telemedicina para ${p.name}` : `Habilitar telemedicina para ${p.name}`}
              >
                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${telemedicinePermissions[p.id] ? "left-6" : "left-1"}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <AdminFab onClick={() => go("admin-professional-form")} />
      <AdminNav active="admin-professionals" go={go} />
    </div>
  );
}

function AdminProfessionalFormScreen({ go }: { go: Nav }) {
  const [form, setForm] = useState({ name: "", cpf: "", reg: "", council: "CRM-PE", specialty: "", phone: "", email: "", clinic: "", status: "Ativo", telemedicine: "Desabilitada", modalities: "Presencial" });
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));
  const clinics = ["Clínica Boa Saúde", "UBS Imbiribeira", "Centro Médico Recife"];
  const councils = ["CRM-PE", "CRO-PE", "CRF-PE", "COREN-PE", "CFP", "CREFITO"];
  const specialties = ["Clínica Geral", "Cardiologia", "Dermatologia", "Ortopedia", "Geriatria", "Neurologia", "Oftalmologia", "Reumatologia"];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <AdminHeader title="Cadastrar Profissional" onBack={() => go("admin-professionals")} go={go} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-8 space-y-3">
        <FormField label="Nome completo" value={form.name} onChange={set("name")} placeholder="Dr. Nome Sobrenome" />
        <FormField label="CPF" value={form.cpf} onChange={set("cpf")} placeholder="000.000.000-00" />
        <div className="grid grid-cols-2 gap-3">
          <FormSelect label="Conselho" value={form.council} onChange={set("council")} options={councils} />
          <FormField label="Nº do registro" value={form.reg} onChange={set("reg")} placeholder="00.000" />
        </div>
        <FormSelect label="Especialidade" value={form.specialty} onChange={set("specialty")} options={["Selecionar...", ...specialties]} />
        <FormField label="Telefone" value={form.phone} onChange={set("phone")} type="tel" placeholder="(81) 99999-0000" />
        <FormField label="E-mail" value={form.email} onChange={set("email")} type="email" placeholder="profissional@email.com" />
        <FormSelect label="Clínica vinculada" value={form.clinic} onChange={set("clinic")} options={["Selecionar clínica...", ...clinics]} />
        <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
          <p className="text-sm font-bold text-cyan-900">Permissão de telemedicina</p>
          <p className="mt-1 text-xs leading-relaxed text-cyan-800">Somente administradores podem alterar esta habilitação.</p>
          <div className="mt-3 space-y-3">
            <FormSelect label="Telemedicina" value={form.telemedicine} onChange={set("telemedicine")} options={["Desabilitada", "Habilitada"]} />
            {form.telemedicine === "Habilitada" && (
              <FormSelect label="Modalidades permitidas" value={form.modalities} onChange={set("modalities")} options={["Presencial e online", "Somente online", "Somente presencial"]} />
            )}
          </div>
        </div>
        <FormSelect label="Status" value={form.status} onChange={set("status")} options={["Ativo", "Inativo"]} />
        <div className="pt-2 space-y-3">
          <PrimaryButton label="Salvar profissional" onClick={() => go("admin-professionals")} />
          <SecondaryButton label="Cancelar" onClick={() => go("admin-professionals")} />
        </div>
      </div>
    </div>
  );
}

type Specialty = { id: number; name: string; desc: string; active: boolean };

function AdminSpecialtiesScreen({ go }: { go: Nav }) {
  const [specs] = useState<Specialty[]>([
    { id: 1, name: "Clínica Geral", desc: "Atendimento geral e orientação primária", active: true },
    { id: 2, name: "Cardiologia", desc: "Doenças do coração e sistema circulatório", active: true },
    { id: 3, name: "Dermatologia", desc: "Doenças da pele, cabelo e unhas", active: true },
    { id: 4, name: "Ortopedia", desc: "Sistema musculoesquelético", active: true },
    { id: 5, name: "Geriatria", desc: "Cuidado integral da saúde da pessoa idosa", active: true },
    { id: 6, name: "Neurologia", desc: "Doenças do sistema nervoso", active: true },
    { id: 7, name: "Oftalmologia", desc: "Saúde ocular e visão", active: true },
    { id: 8, name: "Reumatologia", desc: "Doenças articulares e autoimunes", active: true },
    { id: 9, name: "Pneumologia", desc: "Doenças respiratórias", active: false },
    { id: 10, name: "Otorrinolaringologia", desc: "Ouvido, nariz e garganta", active: true },
  ]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50 relative">
      <StatusBar />
      <AdminHeader title="Especialidades" onBack={() => go("admin-home")} go={go} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-24 space-y-2">
        {specs.map((s) => (
          <div key={s.id} className="bg-white rounded-xl px-4 py-3.5 border border-slate-100 flex items-center gap-3 shadow-sm">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-slate-800 text-sm">{s.name}</p>
                <StatusBadge active={s.active} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{s.desc}</p>
            </div>
            <button onClick={() => go("admin-specialty-form")} className="text-xs text-cyan-500 font-semibold px-3 py-1.5 border border-cyan-200 rounded-lg hover:bg-cyan-50 transition-colors flex-shrink-0">Editar</button>
          </div>
        ))}
      </div>
      <AdminFab onClick={() => go("admin-specialty-form")} />
      <AdminNav active="admin-specialties" go={go} />
    </div>
  );
}

function AdminSpecialtyFormScreen({ go }: { go: Nav }) {
  const [form, setForm] = useState({ name: "", desc: "", status: "Ativo" });
  const set = (k: keyof typeof form) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <AdminHeader title="Cadastrar Especialidade" onBack={() => go("admin-specialties")} go={go} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-8 space-y-4">
        <FormField label="Nome da especialidade" value={form.name} onChange={set("name")} placeholder="Ex: Reumatologia" />
        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1.5">Descrição</label>
          <textarea value={form.desc} onChange={(e) => set("desc")(e.target.value)} placeholder="Breve descrição da especialidade..." rows={3}
            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 placeholder-slate-300 focus:outline-none focus:border-cyan-400 transition-colors resize-none" />
        </div>
        <FormSelect label="Status" value={form.status} onChange={set("status")} options={["Ativo", "Inativo"]} />
        <div className="pt-2 space-y-3">
          <PrimaryButton label="Salvar especialidade" onClick={() => go("admin-specialties")} />
          <SecondaryButton label="Cancelar" onClick={() => go("admin-specialties")} />
        </div>
      </div>
    </div>
  );
}

function AdminAvailabilityScreen({ go }: { go: Nav }) {
  const days = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const slots = ["07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30"];
  const [selectedPro, setSelectedPro] = useState("Dr. Carlos Mendes");
  const [availability, setAvailability] = useState<Record<string, Set<string>>>({});
  const pros = ["Dr. Carlos Mendes", "Dra. Ana Paula Costa", "Dra. Luciana Ferreira"];

  const toggle = (day: string, slot: string) => {
    setAvailability((prev) => {
      const key = day;
      const existing = new Set(prev[key] ?? []);
      if (existing.has(slot)) existing.delete(slot); else existing.add(slot);
      return { ...prev, [key]: existing };
    });
  };

  const isActive = (day: string, slot: string) => availability[day]?.has(slot) ?? false;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <AdminHeader title="Disponibilidade" onBack={() => go("admin-professionals")} go={go} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pt-4 pb-4 space-y-4">
        {/* Professional selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Profissional</label>
          <select value={selectedPro} onChange={(e) => setSelectedPro(e.target.value)}
            className="w-full border-2 border-slate-100 rounded-xl px-4 py-3 text-sm text-slate-700 bg-white focus:outline-none focus:border-cyan-400 transition-colors">
            {pros.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        {/* Day/slot grid */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Horários disponíveis</label>
            <p className="text-xs text-slate-400">Toque para ativar/desativar</p>
          </div>
          {days.map((day) => (
            <div key={day} className="mb-3">
              <p className="text-xs font-semibold text-slate-600 mb-1.5">{day}</p>
              <div className="flex flex-wrap gap-1.5">
                {slots.map((slot) => (
                  <button key={slot} onClick={() => toggle(day, slot)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive(day, slot) ? "bg-cyan-500 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-cyan-300"
                    }`}>
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <PrimaryButton label="Salvar disponibilidade" onClick={() => go("admin-professionals")} />
      </div>
    </div>
  );
}

function AdminUsersScreen({ go }: { go: Nav }) {
  const users = [
    { name: "Maria Aparecida", email: "maria@email.com", role: "paciente", since: "Jan 2025", active: true },
    { name: "Dr. Carlos Mendes", email: "carlos@boasaude.com", role: "profissional", since: "Mar 2025", active: true },
    { name: "Dra. Ana Paula Costa", email: "ana@boasaude.com", role: "profissional", since: "Abr 2025", active: true },
    { name: "Admin Recife", email: "admin@consultafacil.pe.gov.br", role: "administrador", since: "Jan 2025", active: true },
    { name: "João da Silva", email: "joao@email.com", role: "paciente", since: "Jun 2025", active: false },
  ];

  const roleStyle: Record<string, string> = {
    paciente: "text-blue-600 bg-blue-50",
    profissional: "text-purple-600 bg-purple-50",
    administrador: "text-cyan-700 bg-cyan-50",
  };
  const roleLabel: Record<string, string> = {
    paciente: "Paciente",
    profissional: "Profissional",
    administrador: "Admin",
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <AdminHeader title="Usuários" onBack={() => go("admin-home")} go={go} />
      <div className="px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar">
        {["Todos", "Pacientes", "Profissionais", "Admins"].map((f) => (
          <button key={f} className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${f === "Todos" ? "bg-cyan-500 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>{f}</button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-4 space-y-2">
        {users.map((u) => (
          <div key={u.email} className="bg-white rounded-xl px-4 py-3.5 border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-sm font-bold text-slate-500 flex-shrink-0">
                {u.name.split(" ").slice(0, 2).map((w) => w[0]).join("")}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-slate-800 text-sm">{u.name}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${roleStyle[u.role]}`}>{roleLabel[u.role]}</span>
                  <StatusBadge active={u.active} />
                </div>
                <p className="text-xs text-slate-400">{u.email}</p>
                <p className="text-xs text-slate-300 mt-0.5">Desde {u.since}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Telemedicine ────────────────────────────────────────────────────────────

function TelemedicineHubScreen({ go, onOpen, state }: { go: Nav; onOpen: () => void; state: TelemedicineState }) {
  const [preferredMode, setPreferredMode] = useState<"online" | "presencial" | "sem-preferencia">("sem-preferencia");
  const [reminders, setReminders] = useState(true);

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title="Telemedicina" onBack={() => go("profile")} />
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-8">
        <div className="rounded-2xl bg-gradient-to-br from-cyan-500 to-teal-600 p-5 text-white shadow-sm">
          <p className="text-lg font-bold">Consulta online com privacidade</p>
          <p className="mt-2 text-sm leading-relaxed text-cyan-50">Use um ambiente reservado, internet estável e fones de ouvido quando possível.</p>
          <p className="mt-3 text-xs text-cyan-100">A videochamada é apenas uma simulação visual neste protótipo.</p>
        </div>

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">Próxima consulta online</p>
          <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">Ortopedia</p>
                <p className="text-sm text-slate-500">Dr. Carlos Mendes</p>
              </div>
              <span className="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">▣ Online</span>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">📅 16 out 2025 · ⏰ 09:30</p>
            <p className="mt-1 text-xs text-green-700">
              {state === "completed" ? "Consulta finalizada" :
                state === "scheduled" ? "Aguardando liberação da sala" :
                "Sala de espera disponível para demonstração"}
            </p>
            <button onClick={onOpen}
              className="mt-3 w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white">
              {state === "completed" ? "Ver informações pós-atendimento" :
                state === "scheduled" ? "Ver preparação e requisitos" :
                "Preparar e entrar"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="font-bold text-slate-800">Antes da consulta</p>
          <div className="mt-3 space-y-3">
            {[
              ["Câmera", "Permita o acesso somente durante a consulta."],
              ["Microfone", "Use fones para reduzir ruídos e eco."],
              ["Conexão", "Prefira uma rede Wi-Fi estável."],
              ["Privacidade", "Escolha um local onde possa falar com segurança."],
            ].map(([title, description]) => (
              <div key={title} className="flex gap-3">
                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">✓</span>
                <div>
                  <p className="text-sm font-semibold text-slate-700">{title}</p>
                  <p className="text-xs leading-relaxed text-slate-500">{description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <p className="font-bold text-slate-800">Preferências opcionais</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">Não restringem as opções de cada novo agendamento.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {([
              ["online", "Online"],
              ["presencial", "Presencial"],
              ["sem-preferencia", "Sem preferência"],
            ] as const).map(([value, label]) => (
              <button key={value} onClick={() => setPreferredMode(value)}
                className={`rounded-xl border-2 px-2 py-2.5 text-xs font-bold ${
                  preferredMode === value ? "border-cyan-500 bg-cyan-50 text-cyan-800" : "border-slate-100 text-slate-500"
                }`}>{label}</button>
            ))}
          </div>
          <button onClick={() => setReminders((current) => !current)}
            className="mt-3 flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left">
            <span>
              <span className="block text-sm font-semibold text-slate-700">Lembretes da consulta</span>
              <span className="block text-xs text-slate-500">Preferência demonstrativa</span>
            </span>
            <span className={`relative h-7 w-12 rounded-full ${reminders ? "bg-cyan-500" : "bg-slate-200"}`}>
              <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm ${reminders ? "left-6" : "left-1"}`} />
            </span>
          </button>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-white p-4">
          <p className="text-sm font-bold text-slate-700">Após o atendimento</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">Orientações ou documentos aparecerão aqui somente quando forem efetivamente registrados e liberados pelo profissional.</p>
        </div>
      </div>
    </div>
  );
}

function TelemedicineWaitingScreen({
  go,
  role,
  state,
  onStateChange,
  preConsultSummary,
}: {
  go: Nav;
  role: TelemedicineRole;
  state: TelemedicineState;
  onStateChange: (state: TelemedicineState) => void;
  preConsultSummary: PreConsultSummary | null;
}) {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [checking, setChecking] = useState(false);
  const [checksDone, setChecksDone] = useState(true);

  const retryConnection = () => {
    setChecking(true);
    window.setTimeout(() => {
      setChecking(false);
      setChecksDone(true);
      onStateChange("waiting-room-available");
    }, 900);
  };

  const startOrJoin = () => {
    if (role === "patient" && state !== "patient-waiting") {
      onStateChange("patient-waiting");
      return;
    }
    onStateChange("in-progress");
    go("telemedicine-call");
  };

  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <Header title={role === "patient" ? "Preparar consulta" : "Sala de atendimento"} onBack={() => go(role === "patient" ? "telemedicine-hub" : "prof-consultation-detail")} />
      <div className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-5 pb-6">
        <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-bold text-slate-800">{role === "patient" ? "Dr. Carlos Mendes" : "Maria Aparecida Silva"}</p>
              <p className="text-sm text-slate-500">Ortopedia · Hoje às 09:30</p>
            </div>
            <span className="rounded-lg bg-cyan-50 px-2 py-1 text-xs font-bold text-cyan-700">▣ Online</span>
          </div>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-2xl bg-slate-800 shadow-lg">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-700 text-2xl font-bold">
              {cameraOn ? (role === "patient" ? "MA" : "CM") : "—"}
            </div>
            <p className="mt-3 text-sm font-semibold">{cameraOn ? "Prévia simulada da câmera" : "Câmera desligada"}</p>
          </div>
          <span className="absolute bottom-3 left-3 rounded-lg bg-slate-950/70 px-2 py-1 text-xs text-white">Somente demonstração</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => setCameraOn((current) => !current)}
            className={`rounded-xl border-2 py-3 text-sm font-bold ${cameraOn ? "border-cyan-200 bg-cyan-50 text-cyan-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {cameraOn ? "Câmera ligada" : "Câmera desligada"}
          </button>
          <button onClick={() => setMicOn((current) => !current)}
            className={`rounded-xl border-2 py-3 text-sm font-bold ${micOn ? "border-cyan-200 bg-cyan-50 text-cyan-800" : "border-red-200 bg-red-50 text-red-700"}`}>
            {micOn ? "Microfone ligado" : "Microfone mudo"}
          </button>
        </div>

        {state === "connection-error" ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="font-bold text-red-800">Problema de conexão</p>
            <p className="mt-1 text-sm leading-relaxed text-red-700">Não foi possível concluir a verificação simulada.</p>
            <button onClick={retryConnection} className="mt-3 w-full rounded-xl bg-red-500 py-3 text-sm font-bold text-white">{checking ? "Tentando novamente..." : "Tentar novamente"}</button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="font-bold text-slate-800">Verificação do dispositivo</p>
            <div className="mt-3 space-y-2">
              {[["Câmera", cameraOn], ["Microfone", micOn], ["Conexão", checksDone]].map(([label, ok]) => (
                <div key={label as string} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                  <span className="text-sm font-semibold text-slate-700">{label as string}</span>
                  <span className={`text-xs font-bold ${ok ? "text-green-700" : "text-amber-700"}`}>{ok ? "✓ Pronto" : "Verificar"}</span>
                </div>
              ))}
            </div>
            <button onClick={() => onStateChange("connection-error")} className="mt-2 w-full py-2 text-xs font-semibold text-slate-400">Simular problema de conexão</button>
          </div>
        )}

        {role === "professional" && preConsultSummary?.status === "shared" && (
          <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
            <p className="text-sm font-bold text-cyan-900">Resumo pré-consulta autorizado</p>
            <p className="mt-1 text-sm leading-relaxed text-cyan-800">{preConsultSummary.chiefComplaint.value}</p>
          </div>
        )}

        {role === "professional" && state === "professional-waiting" && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="font-bold text-amber-900">Aguardando o paciente retornar</p>
            <p className="mt-1 text-sm leading-relaxed text-amber-800">A consulta permanece ativa no estado demonstrativo.</p>
          </div>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-bold text-amber-900">Privacidade</p>
          <p className="mt-1 text-sm leading-relaxed text-amber-800">Use um ambiente reservado. Esta demonstração não grava nem transmite áudio ou vídeo.</p>
        </div>

        {state === "patient-waiting" && role === "patient" ? (
          <div className="rounded-2xl bg-cyan-500 p-4 text-center text-white">
            <p className="font-bold">Você está na sala de espera</p>
            <p className="mt-1 text-sm text-cyan-100">O profissional será avisado no protótipo.</p>
            <button onClick={startOrJoin} className="mt-3 w-full rounded-xl bg-white py-3 text-sm font-bold text-cyan-700">Simular entrada do profissional</button>
          </div>
        ) : (
          <PrimaryButton
            label={role === "professional"
              ? state === "professional-waiting" ? "Aguardando paciente" : "Iniciar atendimento"
              : "Entrar na sala de espera"}
            onClick={startOrJoin}
            disabled={state === "connection-error" || checking || (role === "professional" && state === "professional-waiting")}
          />
        )}
      </div>
    </div>
  );
}

function TelemedicineCallScreen({
  go,
  role,
  onEnd,
  preConsultSummary,
  onPatientLeave,
}: {
  go: Nav;
  role: TelemedicineRole;
  onEnd: () => void;
  preConsultSummary: PreConsultSummary | null;
  onPatientLeave: () => void;
}) {
  const [cameraOn, setCameraOn] = useState(true);
  const [micOn, setMicOn] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  return (
    <div className="relative flex h-full flex-col bg-slate-950 text-white">
      <StatusBar />
      <div className="flex items-center justify-between px-5 py-3">
        <div>
          <p className="font-bold">{role === "patient" ? "Dr. Carlos Mendes" : "Maria Aparecida Silva"}</p>
          <p className="text-xs text-green-300">● Conexão estável · simulação</p>
        </div>
        <span className="rounded-lg bg-white/10 px-2 py-1 text-xs">12:48</span>
      </div>

      <div className="relative flex-1 overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-cyan-700 text-3xl font-bold">
            {role === "patient" ? "CM" : "MA"}
          </div>
          <p className="mt-4 font-semibold">{role === "patient" ? "Dr. Carlos Mendes" : "Maria Aparecida Silva"}</p>
          <p className="mt-1 text-xs text-slate-400">Vídeo remoto demonstrativo</p>
        </div>
        <div className="absolute right-4 top-4 flex h-32 w-24 items-center justify-center rounded-xl border-2 border-white/30 bg-slate-700 shadow-xl">
          <span className="font-bold">{cameraOn ? (role === "patient" ? "MA" : "CM") : "Câmera off"}</span>
        </div>
        {role === "professional" && showSummary && (
          <div className="absolute inset-x-3 bottom-3 max-h-64 overflow-y-auto rounded-2xl bg-white p-4 text-slate-800 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <p className="font-bold">Resumo pré-consulta</p>
              <button onClick={() => setShowSummary(false)} className="text-sm font-bold text-slate-400">Fechar</button>
            </div>
            {preConsultSummary?.status === "shared" ? (
              <>
                <p className="mt-2 text-xs font-semibold text-slate-400">Motivo</p>
                <p className="text-sm leading-relaxed">{preConsultSummary.chiefComplaint.value}</p>
                <p className="mt-2 text-xs font-semibold text-slate-400">A esclarecer</p>
                {preConsultSummary.needsClarification.map((item) => <p key={item} className="mt-1 text-sm">• {item}</p>)}
                <p className="mt-3 text-xs text-amber-700">Conteúdo automatizado; confirme com o paciente.</p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500">Nenhum resumo autorizado para esta consulta.</p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-3 px-4 py-5">
        <button onClick={() => setMicOn((current) => !current)}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${micOn ? "bg-white/15" : "bg-red-500"}`}
          aria-label={micOn ? "Silenciar microfone" : "Ativar microfone"}>{micOn ? "Mic" : "Mudo"}</button>
        <button onClick={() => setCameraOn((current) => !current)}
          className={`flex h-12 w-12 items-center justify-center rounded-full ${cameraOn ? "bg-white/15" : "bg-red-500"}`}
          aria-label={cameraOn ? "Desligar câmera" : "Ligar câmera"}>{cameraOn ? "Vídeo" : "Off"}</button>
        {role === "professional" && (
          <button onClick={() => setShowSummary((current) => !current)}
            className="flex h-12 items-center justify-center rounded-full bg-white/15 px-4 text-xs font-bold">Resumo</button>
        )}
        <button onClick={() => setShowEndConfirm(true)}
          className="flex h-12 items-center justify-center rounded-full bg-red-500 px-5 text-sm font-bold">
          {role === "professional" ? "Encerrar" : "Sair"}
        </button>
      </div>

      {showEndConfirm && (
        <ConfirmSheet
          title={role === "professional" ? "Encerrar atendimento?" : "Sair da consulta?"}
          desc={role === "professional" ? "A consulta será marcada como finalizada no protótipo." : "Você poderá retornar enquanto o atendimento estiver ativo."}
          confirmLabel={role === "professional" ? "Encerrar consulta" : "Sair agora"}
          danger
          onConfirm={() => {
            setShowEndConfirm(false);
            if (role === "professional") {
              onEnd();
              go("telemedicine-complete");
            } else {
              onPatientLeave();
              go("telemedicine-hub");
            }
          }}
          onCancel={() => setShowEndConfirm(false)}
        />
      )}
    </div>
  );
}

function TelemedicineCompleteScreen({ go, role, documents }: { go: Nav; role: TelemedicineRole; documents: MedicalDocument[] }) {
  const availableDocuments = documents.filter((document) =>
    document.consultId === 1 && document.patient === "Maria Aparecida Silva" && document.status === "available"
  );
  return (
    <div className="flex h-full flex-col bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50 text-3xl text-green-700">✓</div>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consulta finalizada</h1>
          <p className="mt-2 text-base leading-relaxed text-slate-500">O estado foi atualizado apenas nesta demonstração. Nenhum áudio ou vídeo foi gravado.</p>
        </div>
        <div className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm">
          <p className="font-bold text-slate-800">Documentos e orientações pós-atendimento</p>
          {availableDocuments.length > 0 ? (
            <>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{availableDocuments.length} documento(s) disponibilizado(s) pelo profissional.</p>
              {role === "patient" && (
                <button onClick={() => go("patient-documents")} className="mt-3 w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white">Abrir documentos</button>
              )}
            </>
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-slate-500">Os documentos disponibilizados pelo profissional aparecerão aqui.</p>
          )}
        </div>
      </div>
      <div className="space-y-3 px-6 pb-10">
        <PrimaryButton label={role === "patient" ? "Voltar para meus agendamentos" : "Voltar para consultas"} onClick={() => go(role === "patient" ? "appointments" : "prof-consultations")} />
        <SecondaryButton label="Voltar ao início" onClick={() => go(role === "patient" ? "home" : "prof-home")} />
      </div>
    </div>
  );
}

// ─── Professional Data ───────────────────────────────────────────────────────

type ProfConsultation = {
  id: number; patient: string; date: string; time: string;
  clinic: string; specialty: string;
  status: "confirmado" | "aguardando" | "realizada" | "cancelada";
  modality: CareModality;
  teleStatus?: "aguardando" | "em-andamento" | "finalizada";
};

const PROF_CONSULTS: ProfConsultation[] = [
  { id: 1, patient: "Maria Aparecida Silva",  date: "Hoje",    time: "08:00", clinic: "Clínica Boa Saúde", specialty: "Ortopedia", status: "confirmado", modality: "Telemedicina", teleStatus: "aguardando" },
  { id: 2, patient: "João da Silva",          date: "Hoje",    time: "09:30", clinic: "Clínica Boa Saúde", specialty: "Ortopedia", status: "aguardando", modality: "Presencial" },
  { id: 3, patient: "Ana Beatriz Santos",     date: "Hoje",    time: "10:00", clinic: "Clínica Boa Saúde", specialty: "Ortopedia", status: "confirmado", modality: "Telemedicina", teleStatus: "em-andamento" },
  { id: 4, patient: "Carlos Eduardo Lima",    date: "Hoje",    time: "14:00", clinic: "Clínica Boa Saúde", specialty: "Ortopedia", status: "aguardando", modality: "Presencial" },
  { id: 5, patient: "Renata Moreira",         date: "Amanhã",  time: "09:00", clinic: "Clínica Boa Saúde", specialty: "Ortopedia", status: "aguardando", modality: "Telemedicina", teleStatus: "aguardando" },
  { id: 6, patient: "Paulo Henrique Costa",   date: "Amanhã",  time: "10:30", clinic: "Clínica Boa Saúde", specialty: "Ortopedia", status: "aguardando", modality: "Presencial" },
  { id: 7, patient: "Fernanda Oliveira",      date: "14 out",  time: "11:00", clinic: "Clínica Boa Saúde", specialty: "Ortopedia", status: "realizada", modality: "Telemedicina", teleStatus: "finalizada" },
  { id: 8, patient: "Ricardo Alves",          date: "13 out",  time: "08:30", clinic: "Clínica Boa Saúde", specialty: "Ortopedia", status: "cancelada", modality: "Presencial" },
];

type AvailBlock = { id: number; day: string; start: string; end: string; clinic: string; modality: CareModality };

const INITIAL_AVAIL: AvailBlock[] = [
  { id: 1, day: "Segunda-feira", start: "08:00", end: "12:00", clinic: "Clínica Boa Saúde", modality: "Telemedicina" },
  { id: 2, day: "Segunda-feira", start: "14:00", end: "17:00", clinic: "Clínica Boa Saúde", modality: "Presencial" },
  { id: 3, day: "Quarta-feira",  start: "08:00", end: "12:00", clinic: "Clínica Boa Saúde", modality: "Telemedicina" },
  { id: 4, day: "Sexta-feira",   start: "08:00", end: "11:00", clinic: "Clínica Boa Saúde", modality: "Presencial" },
];

const cStyle = (s: string) => ({ confirmado: "text-green-700 bg-green-50", aguardando: "text-yellow-700 bg-yellow-50", realizada: "text-slate-500 bg-slate-100", cancelada: "text-red-600 bg-red-50" }[s] ?? "text-slate-400 bg-slate-100");
const cLabel = (s: string) => ({ confirmado: "Confirmada", aguardando: "Aguardando", realizada: "Realizada", cancelada: "Cancelada" }[s] ?? s);
const cDot  = (s: string) => ({ confirmado: "bg-green-400", aguardando: "bg-yellow-400", realizada: "bg-slate-300", cancelada: "bg-red-400" }[s] ?? "bg-slate-300");

// ─── Shared Overlay Components ────────────────────────────────────────────────

function Toast({ message, sub, onClose }: { message: string; sub?: string; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="absolute top-12 left-3 right-3 z-50 bg-slate-800 text-white rounded-2xl px-4 py-3.5 shadow-2xl flex items-start gap-3">
      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
        <svg width="12" height="10" viewBox="0 0 12 10" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 5l3.5 3.5L11 1"/></svg>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-sm leading-snug">{message}</p>
        {sub && <p className="text-xs text-slate-300 mt-0.5 leading-snug">{sub}</p>}
      </div>
      <button onClick={onClose} className="text-slate-400 hover:text-white mt-0.5">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12"/></svg>
      </button>
    </div>
  );
}

function ConfirmSheet({ title, desc, confirmLabel, danger = false, onConfirm, onCancel }: {
  title: string; desc: string; confirmLabel: string; danger?: boolean;
  onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 bg-slate-900/40 flex items-end z-50">
      <div className="w-full bg-white rounded-t-3xl px-6 pt-4 pb-10 space-y-4">
        <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto" />
        <div className="text-center space-y-1.5 py-2">
          <h3 className="text-lg font-bold text-slate-800">{title}</h3>
          <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
        </div>
        <button onClick={onConfirm} className={`w-full font-bold py-4 rounded-2xl text-base text-white transition-opacity hover:opacity-90 ${danger ? "bg-red-500" : "bg-cyan-500"}`}>{confirmLabel}</button>
        <button onClick={onCancel} className="w-full border-2 border-slate-200 text-slate-700 font-semibold py-4 rounded-2xl hover:bg-slate-50 transition-colors text-base">Cancelar</button>
      </div>
    </div>
  );
}

// ─── Professional Navigation ──────────────────────────────────────────────────

function ProfNav({ active, go }: { active: string; go: Nav }) {
  const items: { id: Screen; label: string; icon: React.ReactNode }[] = [
    { id: "prof-home", label: "Início", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L11 3L19 9.5V19a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"/><path d="M8 20V13h6v7"/>
      </svg>)},
    { id: "prof-agenda", label: "Agenda", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="16" height="15" rx="2"/><path d="M16 3v4M6 3v4M3 9h16"/><path d="M7 13h2M12 13h2M7 16h2"/>
      </svg>)},
    { id: "prof-availability", label: "Horários", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><path d="M11 7v4l3 3"/>
      </svg>)},
    { id: "prof-consultations", label: "Consultas", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3H5a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2h-4"/><rect x="9" y="1" width="4" height="4" rx="1"/><path d="M7 12h8M7 16h5"/>
      </svg>)},
    { id: "prof-profile", label: "Perfil", icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="7" r="4"/><path d="M3 19c0-4 3.6-7 8-7s8 3 8 7"/>
      </svg>)},
  ];
  return (
    <div className="flex justify-around items-center pt-2 pb-3 border-t border-slate-100 bg-white flex-shrink-0">
      {items.map((item) => (
        <button key={item.id} onClick={() => go(item.id)}
          className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-0 ${active === item.id ? "text-cyan-500" : "text-slate-400"}`}>
          {item.icon}
          <span className="text-[10px] font-medium">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Professional Screens ─────────────────────────────────────────────────────

function ProfHomeScreen({ go, onSelect }: { go: Nav; onSelect: (id: number, from: Screen) => void }) {
  const today = PROF_CONSULTS.filter(c => c.date === "Hoje");
  const next  = today.find(c => c.status !== "cancelada");
  const avail = 3;
  const hasNotif = true;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <div className="bg-gradient-to-b from-cyan-500 to-cyan-600 pt-1 flex-shrink-0">
        <StatusBar />
        <div className="px-5 pt-3 pb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-cyan-100 text-sm font-medium">Bem-vindo(a)</p>
              <h1 className="text-xl font-bold text-white mt-0.5">Dr. Carlos Mendes</h1>
              <p className="text-cyan-200 text-sm mt-0.5">Ortopedia · Clínica Boa Saúde</p>
            </div>
            <button onClick={() => go("prof-notifications")}
              className="relative w-10 h-10 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0" aria-label="Notificações">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                <path d="M10 2C10 2 5 5 5 11V14H15V11C15 5 10 2 10 2Z"/><path d="M8 14v1a2 2 0 004 0v-1"/>
              </svg>
              {hasNotif && <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-amber-400 border-2 border-cyan-500" />}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: today.filter(c => c.status !== "cancelada").length, label: "Consultas hoje" },
              { value: avail, label: "Horários livres" },
              { value: today.filter(c => c.status === "aguardando").length, label: "Aguardando" },
            ].map((s) => (
              <div key={s.label} className="bg-white/20 rounded-xl px-2 py-2.5 text-center">
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-cyan-100 mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 -mt-4 space-y-4 pb-4">
        {/* Next consultation */}
        {next && (
          <div className="bg-white rounded-2xl shadow-md p-4 border border-slate-100">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Próxima consulta</p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg ${cStyle(next.status)}`}>{cLabel(next.status)}</span>
            </div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">👤</div>
              <div>
                <p className="font-bold text-slate-800">{next.patient}</p>
                <p className="text-sm text-slate-400">{next.specialty}</p>
                <div className="flex gap-3 mt-1 text-sm text-slate-500">
                  <span>⏰ {next.time}</span><span>🏥 {next.clinic}</span>
                </div>
              </div>
            </div>
            <button onClick={() => { onSelect(next.id, "prof-home"); go("prof-consultation-detail"); }}
              className="w-full bg-cyan-500 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-cyan-600 transition-colors">
              Ver detalhes
            </button>
          </div>
        )}

        {/* Today timeline */}
        <div>
          <div className="flex justify-between items-center mb-2.5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Agenda de hoje</p>
            <button onClick={() => go("prof-agenda")} className="text-xs text-cyan-500 font-semibold">Ver agenda completa →</button>
          </div>
          <div className="space-y-2">
            {today.map((c) => (
              <button key={c.id} onClick={() => { onSelect(c.id, "prof-home"); go("prof-consultation-detail"); }}
                className="w-full bg-white rounded-xl px-4 py-3 border border-slate-100 flex items-center gap-3 shadow-sm hover:border-cyan-200 transition-colors text-left">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cDot(c.status)}`} />
                <span className="text-sm font-bold text-slate-600 w-11 flex-shrink-0">{c.time}</span>
                <span className="text-sm text-slate-700 flex-1 truncate">{c.patient}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0 ${cStyle(c.status)}`}>{cLabel(c.status)}</span>
              </button>
            ))}
            {today.length === 0 && (
              <div className="bg-white rounded-xl px-4 py-6 border border-slate-100 text-center">
                <p className="text-sm text-slate-400">Nenhuma consulta para hoje.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProfNav active="prof-home" go={go} />
    </div>
  );
}

function MiniCalendar({ year, month, selectedDay, onSelect, onPrevMonth, onNextMonth, onToday }: {
  year: number; month: number; selectedDay: number;
  onSelect: (d: number) => void; onPrevMonth: () => void; onNextMonth: () => void; onToday: () => void;
}) {
  const monthNames = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  const dayNames = ["D","S","T","Q","Q","S","S"];
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayNum = isCurrentMonth ? today.getDate() : -1;

  const cells: (number | null)[] = [...Array(firstDow).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={onPrevMonth} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M9 2L4 7l5 5"/></svg>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-700">{monthNames[month]} {year}</span>
          <button onClick={onToday} className="text-xs font-semibold text-cyan-500 border border-cyan-200 px-2 py-0.5 rounded-lg hover:bg-cyan-50 transition-colors">Hoje</button>
        </div>
        <button onClick={onNextMonth} className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center hover:bg-slate-100 transition-colors">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M5 2l5 5-5 5"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-7 mb-1">
        {dayNames.map((d, i) => <span key={i} className="text-center text-xs font-semibold text-slate-400 py-1">{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <span key={i} />;
          const isToday = day === todayNum;
          const isSelected = day === selectedDay;
          const hasConsult = PROF_CONSULTS.some(c => c.date === "Hoje" && day === todayNum);
          return (
            <button key={i} onClick={() => onSelect(day)}
              className={`relative flex flex-col items-center justify-center h-8 w-8 mx-auto rounded-xl text-xs font-semibold transition-all
                ${isSelected ? "bg-cyan-500 text-white" : isToday ? "bg-cyan-50 text-cyan-600" : "text-slate-600 hover:bg-slate-100"}`}>
              {day}
              {hasConsult && !isSelected && <span className="absolute bottom-0.5 w-1 h-1 rounded-full bg-cyan-400" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfAgendaScreen({ go, onSelect }: { go: Nav; onSelect: (id: number, from: Screen) => void }) {
  const [view, setView] = useState<"dia" | "semana" | "mes">("dia");
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedCalDay, setSelectedCalDay] = useState(now.getDate());
  const weekDays = [
    { short: "Seg", num: "13" }, { short: "Ter", num: "14" }, { short: "Qua", num: "15" },
    { short: "Qui", num: "16" }, { short: "Sex", num: "17" },
  ];
  const [activeWeekDay, setActiveWeekDay] = useState(0);

  const slots = [
    { time: "07:30", type: "livre" },
    { time: "08:00", consult: PROF_CONSULTS[0] },
    { time: "08:30", type: "livre" },
    { time: "09:00", type: "livre" },
    { time: "09:30", consult: PROF_CONSULTS[1] },
    { time: "10:00", consult: PROF_CONSULTS[2] },
    { time: "10:30", type: "livre" },
    { time: "11:00", type: "livre" },
    { time: "12:00", type: "intervalo" },
    { time: "14:00", consult: PROF_CONSULTS[3] },
    { time: "14:30", type: "livre" },
    { time: "15:00", type: "livre" },
  ] as { time: string; type?: string; consult?: ProfConsultation }[];

  const prevMonth = () => { if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); } else setCalMonth(m => m - 1); };
  const nextMonth = () => { if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); } else setCalMonth(m => m + 1); };
  const toToday   = () => { setCalYear(now.getFullYear()); setCalMonth(now.getMonth()); setSelectedCalDay(now.getDate()); };

  const selectedDayConsults = PROF_CONSULTS.filter(c => c.date === "Hoje");

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <div className="bg-white border-b border-slate-100 px-5 pt-1 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => go("prof-home")}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800 flex-1">Minha Agenda</h1>
        </div>
        <div className="flex bg-slate-100 rounded-xl p-0.5">
          {(["dia", "semana", "mes"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-1.5 rounded-lg text-sm font-semibold transition-all ${view === v ? "bg-white text-cyan-600 shadow-sm" : "text-slate-400"}`}>
              {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-3 pb-4 space-y-2">
        {/* DIA */}
        {view === "dia" && slots.map((slot, i) => (
          slot.type === "intervalo" ? (
            <div key={i} className="flex items-center gap-3 py-1">
              <span className="text-xs font-semibold text-slate-300 w-11">{slot.time}</span>
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-300 font-medium">Intervalo</span>
            </div>
          ) : slot.consult ? (
            <button key={i} onClick={() => { onSelect(slot.consult!.id, "prof-agenda"); go("prof-consultation-detail"); }}
              className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm hover:border-cyan-200 transition-colors text-left">
              <span className="text-xs font-bold text-slate-500 w-11 flex-shrink-0">{slot.time}</span>
              <div className={`w-1 h-10 rounded-full flex-shrink-0 ${cDot(slot.consult.status)}`} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{slot.consult.patient}</p>
                <p className="text-xs text-slate-400">{slot.consult.specialty} · {slot.consult.modality === "Telemedicina" ? "▣ Online" : "🏥 Presencial"}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0 ${cStyle(slot.consult.status)}`}>{cLabel(slot.consult.status)}</span>
            </button>
          ) : (
            <div key={i} className="flex items-center gap-3 bg-slate-50/80 rounded-xl px-4 py-3 border border-dashed border-slate-200">
              <span className="text-xs font-semibold text-slate-300 w-11 flex-shrink-0">{slot.time}</span>
              <div className="w-1 h-8 rounded-full bg-slate-200 flex-shrink-0" />
              <span className="text-sm text-slate-300 font-medium">Horário disponível</span>
            </div>
          )
        ))}

        {/* SEMANA */}
        {view === "semana" && (<>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-2">
            {weekDays.map((d, i) => (
              <button key={i} onClick={() => setActiveWeekDay(i)}
                className={`flex flex-col items-center px-4 py-2.5 rounded-xl flex-shrink-0 transition-all text-xs font-semibold ${activeWeekDay === i ? "bg-cyan-500 text-white" : "bg-white border border-slate-100 text-slate-600 hover:border-cyan-200"}`}>
                <span>{d.short}</span>
                <span className="text-base font-bold mt-0.5">{d.num}</span>
              </button>
            ))}
          </div>
          <div className="space-y-2">
            {(activeWeekDay === 0 ? slots : slots.filter((_, i) => i % 3 !== 1)).map((slot, i) => (
              slot.type === "intervalo" ? (
                <div key={i} className="flex items-center gap-3 py-1">
                  <span className="text-xs font-semibold text-slate-300 w-11">{slot.time}</span>
                  <div className="flex-1 h-px bg-slate-100" />
                </div>
              ) : slot.consult ? (
                <button key={i} onClick={() => { onSelect(slot.consult!.id, "prof-agenda"); go("prof-consultation-detail"); }}
                  className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm hover:border-cyan-200 transition-colors text-left">
                  <span className="text-xs font-bold text-slate-500 w-11 flex-shrink-0">{slot.time}</span>
                  <div className={`w-1 h-8 rounded-full flex-shrink-0 ${cDot(slot.consult.status)}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-slate-700">{slot.consult.patient}</span>
                    <span className="block text-xs text-slate-400">{slot.consult.modality === "Telemedicina" ? "▣ Online" : "🏥 Presencial"}</span>
                  </span>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0 ${cStyle(slot.consult.status)}`}>{cLabel(slot.consult.status)}</span>
                </button>
              ) : (
                <div key={i} className="flex items-center gap-3 bg-slate-50/80 rounded-xl px-4 py-3 border border-dashed border-slate-200">
                  <span className="text-xs font-semibold text-slate-300 w-11 flex-shrink-0">{slot.time}</span>
                  <span className="text-sm text-slate-300 font-medium">Disponível</span>
                </div>
              )
            ))}
          </div>
        </>)}

        {/* MÊS */}
        {view === "mes" && (<>
          <MiniCalendar year={calYear} month={calMonth} selectedDay={selectedCalDay}
            onSelect={setSelectedCalDay} onPrevMonth={prevMonth} onNextMonth={nextMonth} onToday={toToday} />
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Consultas — {selectedCalDay < 10 ? "0" : ""}{selectedCalDay}/{calMonth + 1 < 10 ? "0" : ""}{calMonth + 1}/{calYear}
            </p>
            {selectedDayConsults.length === 0 ? (
              <div className="bg-white rounded-xl px-4 py-5 text-center border border-slate-100">
                <p className="text-sm text-slate-400">Nenhuma consulta neste dia.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {selectedDayConsults.map(c => (
                  <button key={c.id} onClick={() => { onSelect(c.id, "prof-agenda"); go("prof-consultation-detail"); }}
                    className="w-full flex items-center gap-3 bg-white rounded-xl px-4 py-3 border border-slate-100 shadow-sm hover:border-cyan-200 transition-colors text-left">
                    <div className={`w-1 h-8 rounded-full flex-shrink-0 ${cDot(c.status)}`} />
                    <span className="text-sm font-bold text-slate-600 w-11 flex-shrink-0">{c.time}</span>
                    <span className="text-sm text-slate-700 flex-1 truncate">{c.patient}</span>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0 ${cStyle(c.status)}`}>{cLabel(c.status)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>)}
      </div>
      <ProfNav active="prof-agenda" go={go} />
    </div>
  );
}

function ProfAvailabilityScreen({ go }: { go: Nav }) {
  const [blocks, setBlocks] = useState<AvailBlock[]>(INITIAL_AVAIL);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [form, setForm] = useState({ day: "Segunda-feira", start: "08:00", end: "12:00", clinic: "Clínica Boa Saúde", modality: "Telemedicina" as CareModality });

  const days = ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
  const times = ["06:00","07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00"];
  const grouped = days.map(d => ({ day: d, items: blocks.filter(b => b.day === d) })).filter(g => g.items.length > 0);

  const setF = (k: keyof typeof form) => (v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = () => {
    if (editId !== null) {
      setBlocks(prev => prev.map(b => b.id === editId ? { ...b, ...form } : b));
    } else {
      setBlocks(prev => [...prev, { id: Date.now(), ...form }]);
    }
    setShowForm(false); setEditId(null); setShowToast(true);
  };

  const openEdit = (b: AvailBlock) => {
    setForm({ day: b.day, start: b.start, end: b.end, clinic: b.clinic, modality: b.modality });
    setEditId(b.id); setShowForm(true);
  };

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50 relative">
      <StatusBar />
      <div className="bg-white border-b border-slate-100 px-5 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => go("prof-home")}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800">Disponibilidade</h1>
        </div>
        <button onClick={() => { setEditId(null); setForm({ day: "Segunda-feira", start: "08:00", end: "12:00", clinic: "Clínica Boa Saúde", modality: "Telemedicina" }); setShowForm(true); }}
          className="flex items-center gap-1.5 bg-cyan-500 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-cyan-600 transition-colors">
          <span className="text-base leading-none">+</span> Adicionar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-4 space-y-4">
        {grouped.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl">🗓️</span>
            <p className="text-slate-400 mt-3 font-medium">Nenhuma disponibilidade cadastrada</p>
            <p className="text-sm text-slate-300">Toque em "Adicionar" para começar</p>
          </div>
        )}
        {grouped.map(({ day, items }) => (
          <div key={day}>
            <p className="text-sm font-bold text-slate-600 mb-2">{day}</p>
            <div className="space-y-2">
              {items.map(b => (
                <div key={b.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3 shadow-sm">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{b.start} — {b.end}</p>
                    <p className="text-xs text-slate-400 mt-0.5">🏥 {b.clinic}</p>
                    <p className="mt-1 text-xs font-semibold text-cyan-700">{b.modality === "Telemedicina" ? "▣ Telemedicina" : "🏥 Presencial"}</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(b)} className="text-xs text-cyan-500 font-semibold border border-cyan-200 px-2.5 py-1.5 rounded-lg hover:bg-cyan-50 transition-colors">Editar</button>
                    <button onClick={() => setConfirmDelete(b.id)} className="text-xs text-red-400 font-semibold border border-red-100 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">Excluir</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <ProfNav active="prof-availability" go={go} />

      {/* Add/Edit bottom sheet */}
      {showForm && (
        <div className="absolute inset-0 bg-slate-900/40 flex items-end z-40">
          <div className="w-full bg-white rounded-t-3xl px-5 pt-4 pb-10 space-y-3">
            <div className="w-10 h-1 bg-slate-200 rounded-full mx-auto mb-2" />
            <h3 className="text-lg font-bold text-slate-800">{editId ? "Editar disponibilidade" : "Adicionar disponibilidade"}</h3>
            <FormSelect label="Dia da semana" value={form.day} onChange={setF("day")} options={days} />
            <div className="grid grid-cols-2 gap-3">
              <FormSelect label="Início" value={form.start} onChange={setF("start")} options={times} />
              <FormSelect label="Fim" value={form.end} onChange={setF("end")} options={times} />
            </div>
            <FormSelect label="Clínica" value={form.clinic} onChange={setF("clinic")} options={["Clínica Boa Saúde", "UBS Imbiribeira", "Centro Médico Recife"]} />
            <FormSelect label="Modalidade" value={form.modality} onChange={(value) => setForm((current) => ({ ...current, modality: value as CareModality }))} options={["Telemedicina", "Presencial"]} />
            <div className="flex gap-3 pt-1">
              <SecondaryButton label="Cancelar" onClick={() => setShowForm(false)} />
              <PrimaryButton label="Salvar" onClick={save} />
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {confirmDelete !== null && (
        <ConfirmSheet
          title="Excluir disponibilidade?"
          desc="Este horário será removido da sua agenda. Consultas já agendadas não serão afetadas."
          confirmLabel="Excluir"
          danger
          onConfirm={() => { setBlocks(prev => prev.filter(b => b.id !== confirmDelete)); setConfirmDelete(null); setShowToast(true); }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {showToast && <Toast message="Disponibilidade atualizada!" sub="Sua agenda foi atualizada com sucesso." onClose={() => setShowToast(false)} />}
    </div>
  );
}

function ProfConsultationsScreen({ go, onSelect }: { go: Nav; onSelect: (id: number, from: Screen) => void }) {
  const [filter, setFilter] = useState<"hoje" | "proximas" | "realizadas" | "canceladas">("hoje");
  const [modeFilter, setModeFilter] = useState<"todas" | "presenciais" | "telemedicina" | "aguardando" | "andamento" | "finalizadas">("todas");

  const filtered = PROF_CONSULTS.filter(c => ({
    hoje: c.date === "Hoje",
    proximas: c.date === "Amanhã",
    realizadas: c.status === "realizada",
    canceladas: c.status === "cancelada",
  }[filter])).filter((consultation) => ({
    todas: true,
    presenciais: consultation.modality === "Presencial",
    telemedicina: consultation.modality === "Telemedicina",
    aguardando: consultation.teleStatus === "aguardando",
    andamento: consultation.teleStatus === "em-andamento",
    finalizadas: consultation.teleStatus === "finalizada",
  }[modeFilter]));

  const tabs: { id: typeof filter; label: string }[] = [
    { id: "hoje", label: "Hoje" }, { id: "proximas", label: "Próximas" },
    { id: "realizadas", label: "Realizadas" }, { id: "canceladas", label: "Canceladas" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <div className="bg-white border-b border-slate-100 px-5 pt-2 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => go("prof-home")}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800">Consultas</h1>
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)}
              className={`px-3 py-1.5 rounded-xl text-sm font-semibold whitespace-nowrap flex-shrink-0 transition-all ${filter === t.id ? "bg-cyan-500 text-white" : "bg-slate-100 text-slate-500"}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-2 flex gap-1.5 overflow-x-auto no-scrollbar">
          {([
            ["todas", "Todas"],
            ["presenciais", "Presenciais"],
            ["telemedicina", "Telemedicina"],
            ["aguardando", "Aguardando"],
            ["andamento", "Em andamento"],
            ["finalizadas", "Finalizadas"],
          ] as const).map(([id, label]) => (
            <button key={id} onClick={() => setModeFilter(id)}
              className={`flex-shrink-0 rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                modeFilter === id ? "border-cyan-300 bg-cyan-50 text-cyan-800" : "border-slate-100 bg-white text-slate-500"
              }`}>{label}</button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-4 space-y-2.5">
        {filtered.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl">📋</span>
            <p className="text-slate-400 mt-3 font-medium">Nenhuma consulta aqui</p>
          </div>
        )}
        {filtered.map(c => (
          <button key={c.id} onClick={() => { onSelect(c.id, "prof-consultations"); go("prof-consultation-detail"); }}
            className="w-full bg-white rounded-2xl p-4 border border-slate-100 shadow-sm hover:border-cyan-200 transition-colors text-left">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-lg flex-shrink-0">👤</div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <p className="font-bold text-slate-800 truncate">{c.patient}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-lg flex-shrink-0 ${cStyle(c.status)}`}>{cLabel(c.status)}</span>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">{c.specialty}</p>
                <p className="mt-1 text-xs font-semibold text-cyan-700">{c.modality === "Telemedicina" ? `▣ Telemedicina · ${c.teleStatus === "em-andamento" ? "Em andamento" : c.teleStatus === "finalizada" ? "Finalizada" : "Aguardando"}` : "🏥 Presencial"}</p>
                <div className="flex gap-3 mt-1.5 text-xs text-slate-500">
                  <span>📅 {c.date}</span><span>⏰ {c.time}</span><span>🏥 {c.clinic}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
      <ProfNav active="prof-consultations" go={go} />
    </div>
  );
}

function ConsultationDocumentsSection({
  consultation,
  documents,
  onAddDocument,
  onUpdateDocument,
  onRemoveDocument,
  onDocumentAvailable,
}: {
  consultation: ProfConsultation;
  documents: MedicalDocument[];
  onAddDocument: (document: MedicalDocument) => void;
  onUpdateDocument: (documentId: number, changes: Partial<MedicalDocument>) => void;
  onRemoveDocument: (documentId: number) => void;
  onDocumentAvailable: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [confirmDocument, setConfirmDocument] = useState<MedicalDocument | null>(null);
  const [confirmUnavailable, setConfirmUnavailable] = useState<MedicalDocument | null>(null);
  const [selectedFile, setSelectedFile] = useState<{ name: string; format: string; size: string } | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [form, setForm] = useState<{ type: MedicalDocumentType; title: string; description: string }>({
    type: "Relatório ou orientação pós-consulta",
    title: "",
    description: "",
  });
  const consultationDocuments = documents.filter((document) => document.consultId === consultation.id);

  const resetForm = () => {
    setSelectedFile(null);
    setForm({ type: "Relatório ou orientação pós-consulta", title: "", description: "" });
    setShowForm(false);
  };

  const saveDraft = () => {
    if (!selectedFile || !form.title.trim()) return;
    onAddDocument({
      id: Date.now(),
      consultId: consultation.id,
      patient: consultation.patient,
      professional: "Dr. Carlos Mendes",
      specialty: consultation.specialty,
      consultationDate: `${consultation.date} às ${consultation.time}`,
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      fileName: selectedFile.name,
      fileFormat: selectedFile.format,
      fileSize: selectedFile.size,
      status: "draft",
      version: 1,
    });
    resetForm();
  };

  const createRevision = (document: MedicalDocument) => {
    onAddDocument({
      ...document,
      id: Date.now(),
      title: `${document.title} — revisão`,
      status: "draft",
      madeAvailableAt: undefined,
      version: document.version + 1,
    });
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Documentos do atendimento</p>
        <button onClick={() => setShowForm(true)} className="rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700">+ Adicionar documento</button>
      </div>
      <div className="space-y-2">
        {consultationDocuments.length === 0 && (
          <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <p className="font-semibold text-slate-700">Nenhum documento nesta consulta</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">Anexos selecionados não são enviados automaticamente.</p>
          </div>
        )}
        {consultationDocuments.map((document) => (
          <div key={document.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-red-50 text-xs font-bold text-red-700">
                {document.fileFormat.toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold leading-snug text-slate-800">{document.title}</p>
                  <span className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                    document.status === "available" ? "bg-green-50 text-green-700" :
                    document.status === "draft" ? "bg-amber-50 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    {document.status === "available" ? "Disponível ao paciente" : document.status === "draft" ? "Rascunho" : "Indisponível"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-cyan-700">{document.type} · versão {document.version}</p>
                <p className="mt-2 truncate text-xs text-slate-500">{document.fileName} · {document.fileSize}</p>
              </div>
            </div>
            {document.status === "draft" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => onRemoveDocument(document.id)}
                  className="rounded-xl border-2 border-slate-200 py-2.5 text-xs font-semibold text-slate-600">Remover anexo</button>
                <button onClick={() => setConfirmDocument(document)}
                  className="rounded-xl bg-cyan-500 py-2.5 text-xs font-bold text-white">Disponibilizar</button>
              </div>
            )}
            {document.status === "available" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button onClick={() => createRevision(document)}
                  className="rounded-xl border-2 border-cyan-200 py-2.5 text-xs font-semibold text-cyan-700">Criar revisão</button>
                <button onClick={() => setConfirmUnavailable(document)}
                  className="rounded-xl border-2 border-slate-200 py-2.5 text-xs font-semibold text-slate-600">Tornar indisponível</button>
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="absolute inset-x-0 bottom-0 z-40 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div>
              <p className="text-lg font-bold text-slate-800">Adicionar documento</p>
              <p className="text-xs text-slate-500">O arquivo ficará como rascunho até a confirmação.</p>
            </div>
            <button onClick={resetForm} className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-500" aria-label="Fechar">×</button>
          </div>
          <div className="max-h-96 space-y-3 overflow-y-auto no-scrollbar">
            <FormSelect label="Tipo do documento" value={form.type} onChange={(value) => setForm((current) => ({ ...current, type: value as MedicalDocumentType }))} options={MEDICAL_DOCUMENT_TYPES} />
            <FormField label="Título" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} placeholder="Ex: Orientações após atendimento" />
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-600">Descrição opcional</label>
              <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                rows={2} className="w-full resize-none rounded-xl border-2 border-slate-100 px-4 py-3 text-sm text-slate-700 outline-none focus:border-cyan-400" />
            </div>
            <label className="block cursor-pointer rounded-xl border-2 border-dashed border-cyan-200 bg-cyan-50 p-4 text-center">
              <span className="block text-sm font-bold text-cyan-800">{selectedFile ? "Trocar arquivo" : "Selecionar arquivo"}</span>
              <span className="mt-1 block text-xs text-cyan-700">PDF, JPG ou PNG · demonstração local</span>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setSelectedFile({
                  name: file.name,
                  format: file.name.split(".").pop()?.toLowerCase() || "arquivo",
                  size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                });
              }} />
            </label>
            {selectedFile && (
              <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-700">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500">{selectedFile.format.toUpperCase()} · {selectedFile.size}</p>
                </div>
                <button onClick={() => setSelectedFile(null)} className="text-xs font-bold text-red-600">Remover</button>
              </div>
            )}
            <PrimaryButton label="Salvar como rascunho" onClick={saveDraft} disabled={!selectedFile || !form.title.trim()} />
          </div>
        </div>
      )}

      {confirmDocument && (
        <ConfirmSheet
          title="Disponibilizar ao paciente?"
          desc={`O documento “${confirmDocument.title}” ficará visível para ${consultation.patient}. Esta ação será registrada no estado local do protótipo.`}
          confirmLabel="Disponibilizar documento"
          onConfirm={() => {
            onUpdateDocument(confirmDocument.id, {
              status: "available",
              madeAvailableAt: new Date().toLocaleDateString("pt-BR"),
            });
            setConfirmDocument(null);
            onDocumentAvailable();
            setShowSuccessToast(true);
          }}
          onCancel={() => setConfirmDocument(null)}
        />
      )}
      {confirmUnavailable && (
        <ConfirmSheet
          title="Tornar documento indisponível?"
          desc={`O paciente deixará de acessar “${confirmUnavailable.title}”. A versão permanecerá registrada no estado local para rastreabilidade.`}
          confirmLabel="Tornar indisponível"
          danger
          onConfirm={() => {
            onUpdateDocument(confirmUnavailable.id, { status: "unavailable" });
            setConfirmUnavailable(null);
          }}
          onCancel={() => setConfirmUnavailable(null)}
        />
      )}
      {showSuccessToast && (
        <Toast
          message="Documento disponibilizado"
          sub="O documento já aparece na área do paciente nesta demonstração."
          onClose={() => setShowSuccessToast(false)}
        />
      )}
    </div>
  );
}

function ProfConsultationDetailScreen({
  go,
  consultId,
  from = "prof-consultations",
  preConsultSummary,
  onOpenTelemedicine,
  telemedicineState,
  activeTelemedicineConsultId,
  telemedicineEnabled,
  documents,
  onAddDocument,
  onUpdateDocument,
  onRemoveDocument,
  onDocumentAvailable,
}: {
  go: Nav;
  consultId: number;
  from?: Screen;
  preConsultSummary: PreConsultSummary | null;
  onOpenTelemedicine: () => void;
  telemedicineState: TelemedicineState;
  activeTelemedicineConsultId: number;
  telemedicineEnabled: boolean;
  documents: MedicalDocument[];
  onAddDocument: (document: MedicalDocument) => void;
  onUpdateDocument: (documentId: number, changes: Partial<MedicalDocument>) => void;
  onRemoveDocument: (documentId: number) => void;
  onDocumentAvailable: () => void;
}) {
  const c = PROF_CONSULTS.find(x => x.id === consultId) ?? PROF_CONSULTS[0];
  const [showConfirmSheet, setShowConfirmSheet] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [toast, setToast] = useState<{ msg: string; sub: string } | null>(null);
  const [status, setStatus] = useState(c.status);
  const [showOriginalReport, setShowOriginalReport] = useState(false);
  const summary = preConsultSummary?.consultId === c.id ? preConsultSummary : null;
  const telemedicineCompleted = telemedicineState === "completed" && activeTelemedicineConsultId === c.id;

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50 relative">
      <StatusBar />
      <Header title="Detalhes da consulta" onBack={() => go(from)} />

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 space-y-4 pb-8">
        {/* Status banner */}
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${
          status === "confirmado" ? "bg-green-50 border border-green-100" :
          status === "cancelada"  ? "bg-red-50 border border-red-100" :
          "bg-yellow-50 border border-yellow-100"
        }`}>
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
            status === "confirmado" ? "bg-green-100" : status === "cancelada" ? "bg-red-100" : "bg-yellow-100"
          }`}>
            {status === "confirmado" ? "✓" : status === "cancelada" ? "✕" : "○"}
          </div>
          <div>
            <p className={`font-semibold text-sm ${status === "confirmado" ? "text-green-800" : status === "cancelada" ? "text-red-700" : "text-yellow-800"}`}>
              {cLabel(status)}
            </p>
            <p className="text-xs text-slate-400">Status atual da consulta</p>
          </div>
        </div>

        {/* Patient info */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-50">
            <div className="w-12 h-12 bg-cyan-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">👤</div>
            <div>
              <p className="font-bold text-slate-800">{c.patient}</p>
              <p className="text-sm text-slate-400">Paciente</p>
            </div>
          </div>
          {[
            { icon: "🩺", label: "Especialidade", value: c.specialty },
            { icon: "👨‍⚕️", label: "Profissional responsável", value: "Dr. Carlos Mendes" },
            { icon: "🏥", label: "Clínica",       value: c.clinic },
            { icon: "📅", label: "Data",           value: c.date },
            { icon: "⏰", label: "Horário",         value: c.time },
            { icon: c.modality === "Telemedicina" ? "▣" : "🏥", label: "Modalidade", value: c.modality },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <div>
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-sm font-semibold text-slate-700">{item.value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Pre-consultation summary */}
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Resumo pré-consulta</p>
            {summary?.status === "shared" && (
              <span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Consentido</span>
            )}
          </div>

          {!summary && (
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <p className="font-semibold text-slate-700">Ainda não existe resumo</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">O paciente ainda não gerou um resumo pelo assistente para esta consulta.</p>
            </div>
          )}

          {summary?.status === "insufficient" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="font-semibold text-slate-700">Resumo indisponível</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-500">As informações fornecidas foram insuficientes. Nenhum conteúdo clínico foi inferido.</p>
            </div>
          )}

          {summary?.status === "draft" && (
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50 p-4">
              <p className="font-semibold text-cyan-900">Resumo disponível para o paciente</p>
              <p className="mt-1 text-sm leading-relaxed text-cyan-800">O paciente ainda está revisando. O conteúdo não foi compartilhado com o profissional.</p>
            </div>
          )}

          {summary?.status === "awaiting-consent" && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="font-semibold text-amber-900">Aguardando consentimento</p>
              <p className="mt-1 text-sm leading-relaxed text-amber-800">
                {summary.consent === "declined"
                  ? "O paciente optou por não compartilhar neste momento."
                  : "O conteúdo permanece privado até a autorização explícita do paciente."}
              </p>
            </div>
          )}

          {summary?.status === "shared" && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-cyan-100 bg-white p-4 shadow-sm">
                <div className="rounded-xl bg-cyan-50 p-3">
                  <p className="text-sm font-bold text-cyan-900">Conteúdo gerado a partir da conversa</p>
                  <p className="mt-1 text-xs leading-relaxed text-cyan-800">Confira todas as informações com o paciente. Este resumo não é anamnese, prontuário ou diagnóstico validado.</p>
                </div>

                <div className="mt-4">
                  <p className="text-xs font-semibold text-slate-400">Queixa principal</p>
                  <p className="mt-1 text-base font-bold leading-relaxed text-slate-800">{summary.chiefComplaint.value}</p>
                </div>

                <div className="mt-4 divide-y divide-slate-100 rounded-xl bg-slate-50 px-3">
                  {[
                    ["Descrição nas palavras do paciente", summary.description],
                    ["Início e duração", summary.duration],
                    ["Evolução", summary.evolution],
                    ["Intensidade", summary.intensity],
                    ["Localização", summary.location],
                    ["Frequência", summary.frequency],
                    ["Sintomas associados", summary.associatedSymptoms],
                    ["Informações adicionais", summary.additionalInformation],
                  ].map(([label, field]) => {
                    const summaryFieldValue = field as SummaryField;
                    return (
                      <div key={label as string} className="py-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs text-slate-400">{label as string}</p>
                          {summaryFieldValue.state !== "informed" && (
                            <span className="rounded-lg bg-white px-2 py-0.5 text-xs font-semibold text-slate-500">
                              {summaryFieldValue.state === "not-asked" ? "Não perguntado" :
                                summaryFieldValue.state === "not-clarified" ? "Não esclarecido" : "Não informado"}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm font-medium leading-relaxed text-slate-700">{summaryFieldValue.value}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Informações a esclarecer</p>
                {summary.needsClarification.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {summary.needsClarification.map((item) => (
                      <li key={item} className="flex gap-2 text-sm leading-relaxed text-amber-800">
                        <span aria-hidden="true">•</span><span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1 text-sm text-amber-800">Nenhuma pendência registrada.</p>
                )}
                {summary.unansweredQuestions.length > 0 && (
                  <div className="mt-3 border-t border-amber-200 pt-3">
                    <p className="text-xs font-semibold text-amber-900">Perguntas sem resposta</p>
                    {summary.unansweredQuestions.map((question) => (
                      <p key={question} className="mt-1 text-sm text-amber-800">• {question}</p>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-700">Consentimento e origem</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Consentimento explícito registrado no protótipo. Gerado em {summary.generatedAt}.</p>
                  </div>
                  <span className="rounded-lg bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">Compartilhado</span>
                </div>
                <button onClick={() => setShowOriginalReport((current) => !current)}
                  className="mt-3 w-full rounded-xl border-2 border-cyan-200 py-3 text-sm font-bold text-cyan-700">
                  {showOriginalReport ? "Ocultar relato original" : "Abrir relato original completo"}
                </button>
              </div>

              {showOriginalReport && (
                <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
                  <div className="mb-3">
                    <p className="text-sm font-bold text-slate-800">Relato original do chatbot</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-500">Transcrição demonstrativa preservada separadamente do resumo organizado.</p>
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto no-scrollbar">
                    {summary.originalMessages.map((message, index) => (
                      <div key={`${message.time}-${index}`} className={`rounded-xl p-3 ${
                        message.sender === "patient" ? "ml-6 bg-cyan-50" : "mr-6 bg-slate-50"
                      }`}>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-bold ${message.sender === "patient" ? "text-cyan-800" : "text-slate-600"}`}>
                            {message.sender === "patient" ? "Paciente" : "Assistente virtual"}
                          </p>
                          <span className="text-xs text-slate-400">{message.time}</span>
                        </div>
                        <p className="mt-1 text-sm leading-relaxed text-slate-700">{message.text}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <ConsultationDocumentsSection
          consultation={c}
          documents={documents}
          onAddDocument={onAddDocument}
          onUpdateDocument={onUpdateDocument}
          onRemoveDocument={onRemoveDocument}
          onDocumentAvailable={onDocumentAvailable}
        />

        {/* Actions */}
        {status !== "cancelada" && status !== "realizada" && (
          <div className="space-y-3">
            {c.modality === "Telemedicina" && c.teleStatus !== "finalizada" && !telemedicineCompleted && telemedicineEnabled && (
              <PrimaryButton
                label={c.teleStatus === "em-andamento" ? "Acessar atendimento em andamento" : "Acessar sala virtual"}
                onClick={onOpenTelemedicine}
              />
            )}
            {c.modality === "Telemedicina" && !telemedicineEnabled && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-bold text-amber-900">Telemedicina desabilitada pelo administrador</p>
                <p className="mt-1 text-xs leading-relaxed text-amber-800">O profissional não pode iniciar novos atendimentos online enquanto a permissão estiver desativada.</p>
              </div>
            )}
            {c.modality === "Telemedicina" && telemedicineCompleted && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-bold text-slate-700">Atendimento online finalizado</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">Não há orientações ou documentos liberados neste exemplo.</p>
              </div>
            )}
            {status !== "confirmado" && (
              <PrimaryButton label="✓  Confirmar atendimento" onClick={() => setShowConfirmSheet(true)} />
            )}
            <SecondaryButton label="Cancelar consulta" onClick={() => setShowCancelSheet(true)} />
          </div>
        )}
        {(status === "cancelada" || status === "realizada") && (
          <SecondaryButton label="Voltar às consultas" onClick={() => go("prof-consultations")} />
        )}
      </div>

      {showConfirmSheet && (
        <ConfirmSheet
          title="Confirmar atendimento?"
          desc={`Confirmar a consulta de ${c.patient} às ${c.time}?`}
          confirmLabel="Confirmar"
          onConfirm={() => { setStatus("confirmado"); setShowConfirmSheet(false); setToast({ msg: "Consulta confirmada!", sub: `Atendimento de ${c.patient} confirmado.` }); }}
          onCancel={() => setShowConfirmSheet(false)}
        />
      )}
      {showCancelSheet && (
        <ConfirmSheet
          title="Cancelar consulta?"
          desc={`Deseja cancelar a consulta de ${c.patient} às ${c.time}? O paciente será notificado.`}
          confirmLabel="Cancelar consulta"
          danger
          onConfirm={() => { setStatus("cancelada"); setShowCancelSheet(false); setToast({ msg: "Consulta cancelada.", sub: "O paciente será informado." }); }}
          onCancel={() => setShowCancelSheet(false)}
        />
      )}
      {toast && <Toast message={toast.msg} sub={toast.sub} onClose={() => setToast(null)} />}
    </div>
  );
}

function ProfProfileScreen({ go, telemedicineEnabled }: { go: Nav; telemedicineEnabled: boolean }) {
  const [editing, setEditing] = useState(false);
  const [showSensitiveAlert, setShowSensitiveAlert] = useState(false);
  const [toast, setToast] = useState(false);
  const [form, setForm] = useState({ phone: "(81) 99111-1111", email: "carlos@boasaude.com" });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const fixed = [
    { label: "Nome completo",       value: "Dr. Carlos Mendes",  icon: "👤" },
    { label: "CPF",                  value: "123.456.789-00",     icon: "📋" },
    { label: "Registro profissional",value: "CRM-PE 24.501",      icon: "🏅" },
    { label: "Conselho",             value: "CRM-PE",             icon: "⚖️" },
    { label: "Especialidade",        value: "Ortopedia",          icon: "🩺" },
    { label: "Clínica vinculada",    value: "Clínica Boa Saúde",  icon: "🏥" },
  ];

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50 relative">
      <StatusBar />
      <div className="bg-white border-b border-slate-100 px-5 pt-2 pb-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => go("prof-home")}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800">Meu Perfil</h1>
        </div>
        <button onClick={() => setEditing(e => !e)}
          className={`text-sm font-semibold px-3 py-2 rounded-xl transition-colors ${editing ? "bg-slate-100 text-slate-600" : "bg-cyan-50 text-cyan-600 border border-cyan-200"}`}>
          {editing ? "Cancelar" : "Editar perfil"}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-10 space-y-4">
        {/* Avatar */}
        <div className="flex items-center gap-4 bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center text-2xl font-bold text-white">CM</div>
          <div>
            <p className="font-bold text-slate-800">Dr. Carlos Mendes</p>
            <p className="text-sm text-slate-400">Ortopedia · CRM-PE 24.501</p>
            <p className="text-xs text-green-600 font-medium mt-1">● Ativo</p>
          </div>
        </div>

        {/* Fixed fields (read-only) */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Dados profissionais</p>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
            {fixed.map(f => (
              <div key={f.label} className="flex items-center gap-3 px-4 py-3.5">
                <span className="text-lg flex-shrink-0">{f.icon}</span>
                <div className="flex-1">
                  <p className="text-xs text-slate-400">{f.label}</p>
                  <p className="text-sm font-semibold text-slate-700">{f.value}</p>
                </div>
                {(f.label === "CPF" || f.label.includes("Registro") || f.label === "Conselho") && (
                  <button onClick={() => setShowSensitiveAlert(true)} className="text-xs text-slate-300 font-medium hover:text-slate-500 transition-colors">🔒</button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Atendimento online</p>
          <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">Habilitação para telemedicina</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">Esta permissão é definida exclusivamente pelo perfil administrador.</p>
              </div>
              <span className={`rounded-lg px-2 py-1 text-xs font-bold ${
                telemedicineEnabled ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-500"
              }`}>{telemedicineEnabled ? "Habilitado" : "Desabilitado"}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-600">Modalidades autorizadas</p>
              <p className="mt-1 text-sm text-slate-500">{telemedicineEnabled ? "Atendimento presencial e online" : "Somente atendimento presencial"}</p>
            </div>
            <button onClick={() => go("prof-availability")}
              disabled={!telemedicineEnabled}
              className="w-full rounded-xl border-2 border-cyan-200 py-3 text-sm font-bold text-cyan-700 disabled:border-slate-200 disabled:text-slate-400">Configurar disponibilidade online</button>
            {telemedicineEnabled && (
              <>
                <button onClick={() => go("prof-consultations")}
                  className="w-full rounded-xl bg-cyan-500 py-3 text-sm font-bold text-white">Ver consultas virtuais agendadas</button>
                <div className="grid grid-cols-3 gap-2 text-center">
                  {[["2", "Aguardando"], ["1", "Em andamento"], ["1", "Finalizada"]].map(([value, label]) => (
                    <div key={label} className="rounded-xl bg-slate-50 p-2">
                      <p className="text-lg font-bold text-slate-800">{value}</p>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Editable fields */}
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Contato</p>
          {editing ? (
            <div className="space-y-3">
              <FormField label="Telefone" value={form.phone} onChange={(v) => setForm(p => ({ ...p, phone: v }))} type="tel" placeholder="(81) 99999-0000" />
              <FormField label="E-mail" value={form.email} onChange={(v) => setForm(p => ({ ...p, email: v }))} type="email" placeholder="email@dominio.com" />
              <PrimaryButton label="Salvar alterações" onClick={() => { setEditing(false); setToast(true); }} />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm divide-y divide-slate-50">
              {[{ icon: "📞", label: "Telefone", value: form.phone }, { icon: "✉️", label: "E-mail", value: form.email }].map(f => (
                <div key={f.label} className="flex items-center gap-3 px-4 py-3.5">
                  <span className="text-lg">{f.icon}</span>
                  <div>
                    <p className="text-xs text-slate-400">{f.label}</p>
                    <p className="text-sm font-semibold text-slate-700">{f.value}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Documentos médicos</p>
          <button onClick={() => go("prof-consultations")}
            className="w-full rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-sm">
            <p className="font-bold text-slate-800">Documentos por consulta</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">Abra uma consulta autorizada para visualizar ou gerenciar seus anexos.</p>
          </button>
        </div>

        <button onClick={() => go("login")} className="w-full py-4 rounded-2xl text-red-500 border-2 border-red-100 font-semibold text-sm hover:bg-red-50 transition-colors">
          Sair da conta
        </button>
      </div>

      {showSensitiveAlert && (
        <ConfirmSheet
          title="Campo protegido"
          desc="Informações de registro profissional não podem ser alteradas aqui. Entre em contato com a administração da plataforma para solicitar correções."
          confirmLabel="Entendi"
          onConfirm={() => setShowSensitiveAlert(false)}
          onCancel={() => setShowSensitiveAlert(false)}
        />
      )}
      {toast && <Toast message="Perfil atualizado!" sub="Suas informações de contato foram salvas." onClose={() => setToast(false)} />}
      <ProfNav active="prof-profile" go={go} />
    </div>
  );
}

// ─── Professional Notifications ──────────────────────────────────────────────

const PROF_NOTIFS = [
  { id: 1, icon: "📅", title: "Nova consulta agendada", desc: "Ana Beatriz Santos — hoje às 10:00", time: "Agora", read: false },
  { id: 2, icon: "❌", title: "Consulta cancelada", desc: "Paulo Henrique Costa cancelou a consulta de amanhã às 10:30", time: "2h atrás", read: false },
  { id: 3, icon: "🔔", title: "Lembrete de agenda", desc: "Você possui 4 consultas hoje. Primeira às 08:00.", time: "Hoje, 07:30", read: false },
  { id: 4, icon: "🔄", title: "Consulta remarcada", desc: "João da Silva remarcou para 14/10 às 09:00", time: "Ontem", read: true },
  { id: 5, icon: "✅", title: "Horário atualizado", desc: "Sua disponibilidade de sexta-feira foi confirmada", time: "Ontem", read: true },
];

function ProfNotificationsScreen({ go }: { go: Nav }) {
  const [notifs, setNotifs] = useState(PROF_NOTIFS);
  const unread = notifs.filter(n => !n.read);
  const read   = notifs.filter(n => n.read);

  const markAllRead = () => setNotifs(p => p.map(n => ({ ...n, read: true })));
  const markRead = (id: number) => setNotifs(p => p.map(n => n.id === id ? { ...n, read: true } : n));

  const NotifItem = ({ n }: { n: typeof PROF_NOTIFS[0] }) => (
    <button onClick={() => markRead(n.id)}
      className={`w-full flex items-start gap-3 px-4 py-3.5 rounded-2xl border transition-colors text-left ${n.read ? "bg-white border-slate-100" : "bg-cyan-50/50 border-cyan-100"}`}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${n.read ? "bg-slate-50" : "bg-white"}`}>{n.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <p className={`text-sm font-semibold leading-snug ${n.read ? "text-slate-600" : "text-slate-800"}`}>{n.title}</p>
          {!n.read && <span className="w-2 h-2 rounded-full bg-cyan-500 flex-shrink-0 mt-1" />}
        </div>
        <p className="text-xs text-slate-400 mt-0.5 leading-snug">{n.desc}</p>
        <p className="text-xs text-slate-300 mt-1">{n.time}</p>
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-sky-50 to-teal-50">
      <StatusBar />
      <div className="bg-white border-b border-slate-100 px-5 pt-2 pb-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <button onClick={() => go("prof-home")}
            className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round"><path d="M10 3L5 8l5 5"/></svg>
          </button>
          <h1 className="text-xl font-bold text-slate-800">Notificações</h1>
        </div>
        {unread.length > 0 && (
          <button onClick={markAllRead} className="text-xs text-cyan-500 font-semibold">Marcar todas como lidas</button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-4 pb-6 space-y-5">
        {unread.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">
              Não lidas <span className="bg-cyan-500 text-white rounded-full text-xs px-1.5 py-0.5 ml-1">{unread.length}</span>
            </p>
            <div className="space-y-2">{unread.map(n => <NotifItem key={n.id} n={n} />)}</div>
          </div>
        )}
        {read.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Anteriores</p>
            <div className="space-y-2">{read.map(n => <NotifItem key={n.id} n={n} />)}</div>
          </div>
        )}
        {notifs.length === 0 && (
          <div className="text-center py-16">
            <span className="text-4xl">🔔</span>
            <p className="text-slate-400 mt-3 font-medium">Nenhuma notificação</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [notificationFrom, setNotificationFrom] = useState<Screen>("home");
  const [accessibility, setAccessibility] = useState<AccessibilityPreferences>({
    largeText: false,
    highContrast: false,
  });
  const [triageAnswers, setTriageAnswers] = useState<Record<string, string>>({});
  const [showSuccess, setShowSuccess] = useState(false);
  const [profConsultId, setProfConsultId] = useState<number>(1);
  const [profConsultFrom, setProfConsultFrom] = useState<Screen>("prof-consultations");
  const [preConsultSummary, setPreConsultSummary] = useState<PreConsultSummary | null>(null);
  const [bookingModality, setBookingModality] = useState<CareModality>("Presencial");
  const [telemedicineRole, setTelemedicineRole] = useState<TelemedicineRole>("patient");
  const [telemedicineState, setTelemedicineState] = useState<TelemedicineState>("scheduled");
  const [telemedicineConsultId, setTelemedicineConsultId] = useState(1);
  const [telemedicinePermissions, setTelemedicinePermissions] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
  });
  const [medicalDocuments, setMedicalDocuments] = useState<MedicalDocument[]>([]);
  const [hasDocumentNotification, setHasDocumentNotification] = useState(false);

  const go: Nav = (s) => {
    if (s === "notifications") setNotificationFrom(screen);
    setScreen(s);
  };

  const onAnswer = (key: string, val: string) => {
    setTriageAnswers((prev) => ({ ...prev, [key]: val }));
  };

  const renderScreen = () => {
    switch (screen) {
      case "splash": return <SplashScreen go={go} />;
      case "welcome": return <WelcomeScreen go={go} />;
      case "login": return <LoginScreen go={go} />;
      case "register": return <RegisterScreen go={go} />;
      case "forgot-password": return <ForgotPasswordScreen go={go} />;
      case "home": return <HomeScreen go={go} />;
      case "triage-intro": return <TriageIntroScreen go={go} />;
      case "health-chat": return <HealthChatScreen go={go} preConsultSummary={preConsultSummary} onSummaryChange={setPreConsultSummary} telemedicinePermissions={telemedicinePermissions} />;
      case "audio-record": return <AudioRecordScreen go={go} onAnswer={onAnswer} />;
      case "audio-transcribing": return <AudioTranscribingScreen go={go} />;
      case "audio-review": return <AudioReviewScreen go={go} onAnswer={onAnswer} />;
      case "audio-guidance-result": return <AudioGuidanceResultScreen go={go} transcript={triageAnswers.audioTranscription ?? ""} />;
      case "triage-q1": return <TriageQ1Screen go={go} onAnswer={onAnswer} />;
      case "triage-q2": return <TriageQ2Screen go={go} onAnswer={onAnswer} />;
      case "triage-q3": return <TriageQ3Screen go={go} onAnswer={onAnswer} />;
      case "triage-q4": return <TriageQ4Screen go={go} onAnswer={onAnswer} />;
      case "triage-q5": return <TriageQ5Screen go={go} onAnswer={onAnswer} />;
      case "triage-processing": return <TriageProcessingScreen go={go} triageAnswers={triageAnswers} />;
      case "triage-result": return <TriageResultScreen go={go} />;
      case "triage-emergency": return <EmergencyScreen go={go} />;
      case "specialty": return <SpecialtyScreen go={go} />;
      case "clinics": return <ClinicsScreen go={go} />;
      case "modality": return <ModalityScreen go={go} onSelect={(modality) => { setBookingModality(modality); go("professional"); }} />;
      case "professional": return <ProfessionalScreen go={go} modality={bookingModality} telemedicinePermissions={telemedicinePermissions} />;
      case "date": return <DateScreen go={go} />;
      case "time-select": return <TimeSelectScreen go={go} modality={bookingModality} />;
      case "review": return <ReviewScreen go={go} modality={bookingModality} onSuccess={() => setShowSuccess(true)} />;
      case "appointments": return <AppointmentsScreen go={go} telemedicineState={telemedicineState} onOpenTelemedicine={() => {
        setTelemedicineRole("patient");
        setTelemedicineConsultId(1);
        if (telemedicineState === "completed") go("telemedicine-complete");
        else { setTelemedicineState("waiting-room-available"); go("telemedicine-waiting"); }
      }} />;
      case "appointment-detail": return <AppointmentDetailScreen go={go} documents={medicalDocuments} onOpenTelemedicine={() => {
        setTelemedicineRole("patient");
        setTelemedicineConsultId(1);
        if (telemedicineState === "completed") go("telemedicine-complete");
        else { setTelemedicineState("waiting-room-available"); go("telemedicine-waiting"); }
      }} />;
      case "history": return <HistoryScreen go={go} />;
      case "notifications": return <NotificationsScreen go={go} backTo={notificationFrom} hasDocumentNotification={hasDocumentNotification} />;
      case "profile": return <ProfileScreen go={go} accessibility={accessibility} onAccessibilityChange={setAccessibility} />;
      case "patient-documents": return <PatientDocumentsScreen go={go} documents={medicalDocuments} />;
      case "telemedicine-hub": return <TelemedicineHubScreen go={go} state={telemedicineState} onOpen={() => {
        setTelemedicineRole("patient");
        setTelemedicineConsultId(1);
        if (telemedicineState === "completed") go("telemedicine-complete");
        else { setTelemedicineState("waiting-room-available"); go("telemedicine-waiting"); }
      }} />;
      case "telemedicine-waiting": return <TelemedicineWaitingScreen go={go} role={telemedicineRole} state={telemedicineState} onStateChange={setTelemedicineState} preConsultSummary={
        preConsultSummary?.consultId === (telemedicineRole === "professional" ? profConsultId : 1) ? preConsultSummary : null
      } />;
      case "telemedicine-call": return <TelemedicineCallScreen go={go} role={telemedicineRole} preConsultSummary={
        preConsultSummary?.consultId === (telemedicineRole === "professional" ? profConsultId : 1) ? preConsultSummary : null
      } onEnd={() => setTelemedicineState("completed")} onPatientLeave={() => setTelemedicineState("professional-waiting")} />;
      case "telemedicine-complete": return <TelemedicineCompleteScreen go={go} role={telemedicineRole} documents={medicalDocuments} />;
      case "admin-home": return <AdminHomeScreen go={go} />;
      case "admin-clinics": return <AdminClinicsScreen go={go} />;
      case "admin-clinic-form": return <AdminClinicFormScreen go={go} />;
      case "admin-professionals": return <AdminProfessionalsScreen
        go={go}
        telemedicinePermissions={telemedicinePermissions}
        onTelemedicinePermissionChange={(professionalId, enabled) => {
          setTelemedicinePermissions((current) => ({ ...current, [professionalId]: enabled }));
        }}
      />;
      case "admin-professional-form": return <AdminProfessionalFormScreen go={go} />;
      case "admin-specialties": return <AdminSpecialtiesScreen go={go} />;
      case "admin-specialty-form": return <AdminSpecialtyFormScreen go={go} />;
      case "admin-availability": return <AdminAvailabilityScreen go={go} />;
      case "admin-users": return <AdminUsersScreen go={go} />;
      case "prof-home": return <ProfHomeScreen go={go} onSelect={(id, from) => { setProfConsultId(id); setProfConsultFrom(from); }} />;
      case "prof-agenda": return <ProfAgendaScreen go={go} onSelect={(id, from) => { setProfConsultId(id); setProfConsultFrom(from); }} />;
      case "prof-availability": return <ProfAvailabilityScreen go={go} />;
      case "prof-consultations": return <ProfConsultationsScreen go={go} onSelect={(id, from) => { setProfConsultId(id); setProfConsultFrom(from); }} />;
      case "prof-consultation-detail": return <ProfConsultationDetailScreen
        go={go}
        consultId={profConsultId}
        from={profConsultFrom}
        preConsultSummary={preConsultSummary}
        telemedicineState={telemedicineState}
        activeTelemedicineConsultId={telemedicineConsultId}
        telemedicineEnabled={telemedicinePermissions[1] !== false}
        documents={medicalDocuments}
        onAddDocument={(document) => setMedicalDocuments((current) => [...current, document])}
        onUpdateDocument={(documentId, changes) => setMedicalDocuments((current) =>
          current.map((document) => document.id === documentId ? { ...document, ...changes } : document)
        )}
        onRemoveDocument={(documentId) => setMedicalDocuments((current) =>
          current.filter((document) => document.id !== documentId)
        )}
        onDocumentAvailable={() => setHasDocumentNotification(true)}
        onOpenTelemedicine={() => {
        setTelemedicineRole("professional");
        setTelemedicineConsultId(profConsultId);
        setTelemedicineState("patient-waiting");
        go("telemedicine-waiting");
      }} />;
      case "prof-profile": return <ProfProfileScreen go={go} telemedicineEnabled={telemedicinePermissions[1] !== false} />;
      case "prof-notifications": return <ProfNotificationsScreen go={go} />;
      default: return <HomeScreen go={go} />;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-300 p-4">
      <div
        className="relative bg-white overflow-hidden shadow-2xl"
        style={{
          width: "390px",
          height: "844px",
          borderRadius: "44px",
          boxShadow: "0 0 0 10px #1e293b, 0 30px 80px rgba(0,0,0,0.4)",
        }}
      >
        {/* Notch */}
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 z-50 pointer-events-none"
          style={{ width: "120px", height: "30px", borderRadius: "0 0 20px 20px" }}
        />
        <div className={`h-full w-full overflow-hidden flex flex-col relative ${accessibility.largeText ? "accessibility-large-text" : ""} ${accessibility.highContrast ? "accessibility-high-contrast" : ""}`}>
          {renderScreen()}
          {showSuccess && (
            <SuccessModal
              modality={bookingModality}
              onAppointments={() => { setShowSuccess(false); go("appointments"); }}
              onHome={() => { setShowSuccess(false); go("home"); }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
