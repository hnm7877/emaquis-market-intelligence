'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchMarketSession, requestAdminOtp, verifyAdminOtp } from '@/api/marketIntelligence.api';
import { clearAuthToken, setAuthToken } from '@/lib/auth';

const REASONS: Record<string, string> = {
  expired: 'Votre session a expiré. Reconnectez-vous.',
  forbidden: "Ce compte n'est pas autorisé à accéder à Market Intelligence.",
};

const errorMessage = (err: unknown, fallback: string) => {
  const message = (err as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(', ') : message || fallback;
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reason = searchParams.get('reason');

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(reason ? REASONS[reason] ?? null : null);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await requestAdminOtp(email.trim());
      setStep('otp');
    } catch (err) {
      setError(errorMessage(err, "Impossible d'envoyer le code de connexion."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { access_token } = await verifyAdminOtp(email.trim(), otp.trim());
      setAuthToken(access_token);
      // Vérifie que ce token ouvre bien l'accès Market Intelligence
      await fetchMarketSession();
      router.replace('/');
    } catch (err) {
      clearAuthToken();
      setError(errorMessage(err, 'Code invalide ou expiré.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border border-border/80 bg-card/80 backdrop-blur-md p-6 space-y-5">
        <div className="space-y-1 text-center">
          <div className="mx-auto size-11 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-md">
            <Lock className="size-5" />
          </div>
          <h1 className="text-lg font-bold text-foreground pt-2">E-Maquis Market Intelligence</h1>
          <p className="text-xs text-muted-foreground">Accès réservé aux comptes autorisés</p>
        </div>

        {error && (
          <p className="text-xs rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 p-2.5">{error}</p>
        )}

        {step === 'email' ? (
          <form onSubmit={handleRequestOtp} className="space-y-3">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5" htmlFor="email">
              <Mail className="size-3.5" /> Email administrateur
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@e-maquis.com"
              className="h-9 text-sm"
              required
            />
            <Button type="submit" disabled={loading} className="w-full h-9 text-xs font-semibold gap-2">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Recevoir un code de connexion
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Un code a été envoyé à <strong className="text-foreground">{email}</strong> (valable 15 minutes).
            </p>
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5" htmlFor="otp">
              <KeyRound className="size-3.5" /> Code reçu
            </label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="1234567"
              maxLength={7}
              className="h-9 text-sm tracking-[0.3em] font-mono"
              required
            />
            <Button type="submit" disabled={loading} className="w-full h-9 text-xs font-semibold gap-2">
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              Se connecter
            </Button>
            <button
              type="button"
              onClick={() => {
                setStep('email');
                setOtp('');
              }}
              className="w-full text-[11px] text-muted-foreground hover:text-foreground"
            >
              Changer d&apos;email
            </button>
          </form>
        )}

        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <ShieldCheck className="size-3 text-emerald-500" /> Accès journalisé
        </p>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
