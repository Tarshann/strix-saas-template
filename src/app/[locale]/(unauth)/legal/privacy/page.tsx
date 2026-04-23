import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Privacy Policy · Strix',
  description: 'Strix Privacy Policy.',
};

export default function PrivacyPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Strix
        </Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 2025
      </p>

      <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
        <p>
          This Privacy Policy explains how Strix ("we", "us", or "our") collects,
          uses, and protects information when you use our service.
        </p>

        <h2>1. Information We Collect</h2>
        <ul>
          <li>
            <strong>Email address</strong> — if you submit via the early-access
            or lead-capture forms, we store your email alongside the form source,
            optional company name, and your stated use case.
          </li>
          <li>
            <strong>Account information</strong> — name and email associated with
            your Clerk account if you sign up. Authentication is handled directly
            by Clerk; refer to Clerk's privacy policy for their data practices.
          </li>
          <li>
            <strong>Usage data</strong> — server logs may include hashed IP
            addresses, browser user agent, and referrer URL for security and abuse
            prevention. Raw IP addresses are never stored.
          </li>
          <li>
            <strong>Demo interactions</strong> — governance decisions and proof
            receipts generated in the Strix Store demo are computed client-side
            and not transmitted to our servers.
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <ul>
          <li>To contact you about Strix access and product updates, if you opted in.</li>
          <li>To detect and prevent spam, fraud, and abuse.</li>
          <li>To operate and improve the service.</li>
        </ul>
        <p>We do not sell your personal data to third parties.</p>

        <h2>3. Data Retention</h2>
        <p>
          Lead and account data is retained for as long as your account is active or
          as needed to provide services. You may request deletion at any time by
          emailing{' '}
          <a href="mailto:hello@strixgov.com">hello@strixgov.com</a>.
        </p>

        <h2>4. Third-Party Services</h2>
        <ul>
          <li>
            <strong>Clerk</strong> — authentication. See
            {' '}
            <a href="https://clerk.com/privacy" target="_blank" rel="noopener noreferrer">
              clerk.com/privacy
            </a>
            .
          </li>
          <li>
            <strong>Sentry</strong> — error monitoring. Sentry may receive
            anonymized stack traces and browser metadata when errors occur.
          </li>
          <li>
            <strong>Vercel</strong> — hosting. Vercel processes request logs as
            part of serving the application.
          </li>
        </ul>

        <h2>5. Cookies</h2>
        <p>
          We use session cookies required for authentication (via Clerk). We do not
          use third-party tracking cookies or advertising pixels.
        </p>

        <h2>6. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have rights to access, correct,
          or delete your personal data. To exercise these rights, email{' '}
          <a href="mailto:hello@strixgov.com">hello@strixgov.com</a>.
        </p>

        <h2>7. Changes to This Policy</h2>
        <p>
          We may update this policy. We will indicate the "last updated" date
          above. Continued use after changes constitutes acceptance.
        </p>

        <h2>8. Contact</h2>
        <p>
          <a href="mailto:hello@strixgov.com">hello@strixgov.com</a>
        </p>
      </div>
    </div>
  );
}
