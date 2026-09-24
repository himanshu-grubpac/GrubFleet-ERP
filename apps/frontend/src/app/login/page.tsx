'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

const loginFormSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

export default function LoginPage() {
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = form.handleSubmit(() => {
    // Auth API not implemented — placeholder only
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to GrubPac ERP</CardTitle>
          <CardDescription>
            Auth endpoints are scaffolded on the backend. This form validates input only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSubmit} noValidate>
            <div className="space-y-1">
              <label htmlFor="email" className="text-sm font-medium text-blue-950">
                Email
              </label>
              <Input id="email" type="email" autoComplete="email" {...form.register('email')} />
              {form.formState.errors.email ? (
                <p className="text-xs text-red-600">{form.formState.errors.email.message}</p>
              ) : null}
            </div>
            <div className="space-y-1">
              <label htmlFor="password" className="text-sm font-medium text-blue-950">
                Password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...form.register('password')}
              />
              {form.formState.errors.password ? (
                <p className="text-xs text-red-600">{form.formState.errors.password.message}</p>
              ) : null}
            </div>
            <Button type="submit" className="w-full">
              Continue (placeholder)
            </Button>
            <p className="text-center text-xs text-slate-500">
              <Link href="/dashboard" className="text-blue-700 hover:underline">
                Skip to dashboard shell
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
