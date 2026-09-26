import React, { useState, useEffect, useRef } from 'react';
import { Heart, Phone, KeyRound, ArrowRight, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { ThemeToggle } from './ThemeToggle';
import { sendOtp, verifyOtp } from './api/auth';

interface User {
  userId: string;
  mobile: string;
  isNewUser: boolean;
}

interface AuthFormProps {
  onLogin: (user: User) => void;
}

type AuthStep = 'mobile' | 'otp';

const RESEND_COOLDOWN_SECONDS = 60;

export function AuthForm({ onLogin }: AuthFormProps) {
  const [step, setStep] = useState<AuthStep>('mobile');
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState('');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (cooldownRef.current) clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetMessages = () => {
    setError('');
    setSuccess('');
  };

  // Basic validation — expects a 10-digit Indian mobile number (adjust as needed)
  const validateMobile = (value: string) => /^[6-9]\d{9}$/.test(value);

  const toE164 = (value: string) => `+91${value}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!validateMobile(mobile)) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const res = await sendOtp(toE164(mobile));
      setSuccess(res.message || 'OTP sent successfully');
      setStep('otp');
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0) return;
    resetMessages();
    setLoading(true);
    try {
      const res = await sendOtp(toE164(mobile));
      setSuccess(res.message || 'OTP resent successfully');
      startCooldown();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();

    if (!otp || otp.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const res = await verifyOtp(toE164(mobile), otp);
      const user: User = {
        userId: res.userId,
        mobile: toE164(mobile),
        isNewUser: res.isNewUser,
      };
      setSuccess('OTP verified! Redirecting...');
      setTimeout(() => onLogin(user), 800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Incorrect or expired OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('mobile');
    setOtp('');
    resetMessages();
    if (cooldownRef.current) clearInterval(cooldownRef.current);
    setCooldown(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-chart-1/5 via-chart-2/5 to-chart-3/5 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center justify-center space-x-2 flex-1">
              <Heart className="h-12 w-12 text-chart-1 animate-pulse" />
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-chart-1 to-chart-2 bg-clip-text text-transparent">
                  LifeLogix
                </h1>
                <p className="text-sm text-muted-foreground">Smart Tracking for a Healthier You</p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>

        <Card className="shadow-xl border-0 bg-card/95 backdrop-blur">
          <CardHeader className="text-center">
            <CardTitle>
              {step === 'mobile' ? 'Welcome to LifeLogix' : 'Verify your number'}
            </CardTitle>
            <CardDescription>
              {step === 'mobile'
                ? 'Enter your mobile number to sign in or create an account'
                : `Enter the 6-digit code sent to +91 ${mobile}`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {step === 'mobile' && (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <span className="absolute left-9 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                      +91
                    </span>
                    <Input
                      id="mobile"
                      type="tel"
                      inputMode="numeric"
                      placeholder="98765 43210"
                      className="pl-16"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send OTP
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            )}

            {step === 'otp' && (
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Verification Code</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="otp"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit code"
                      className="pl-10 text-center tracking-widest"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert>
                    <CheckCircle className="h-4 w-4" />
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </Button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    onClick={handleChangeNumber}
                  >
                    Change number
                  </button>
                  <button
                    type="button"
                    className="text-chart-1 hover:text-chart-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleResendOtp}
                    disabled={cooldown > 0 || loading}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}