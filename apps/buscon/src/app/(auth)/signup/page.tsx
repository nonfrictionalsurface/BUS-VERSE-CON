import { SignupForm } from '@/features/auth/SignupForm';
import { BusConLogo } from '@/components/brand/BusConLogo';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-canvas-bg p-6 py-12">
      <div className="mb-8">
        <BusConLogo />
      </div>
      <SignupForm />
    </div>
  );
}