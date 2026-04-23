import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_setRequestLocale } from 'next-intl/server';

export const metadata: Metadata = {
  title: 'Terms of Service · Strix',
  description: 'Strix Terms of Service.',
};

export default function TermsPage({ params }: { params: { locale: string } }) {
  unstable_setRequestLocale(params.locale);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
      <div className="mb-8">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Strix
        </Link>
      </div>

      <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: April 2025
      </p>

      <div className="prose prose-slate mt-8 max-w-none dark:prose-invert">
        <p>
          These Terms of Service govern your use of the Strix demo and any
          associated services operated by Strix ("we", "us", or "our"). By
          accessing or using Strix, you agree to be bound by these terms.
        </p>

        <h2>1. The Demo</h2>
        <p>
          The Strix Store demo is a fully client-side simulation. No real
          financial transactions, refunds, or data exports occur. All governance
          decisions, receipts, and intercepts are computed in your browser and
          are not persisted server-side beyond your session.
        </p>

        <h2>2. Early Access and Lead Capture</h2>
        <p>
          If you submit your email address, we will use it solely to contact
          you about Strix access, product updates, and related communications.
          We will not sell or share your information with third parties for
          marketing purposes.
        </p>

        <h2>3. Accounts</h2>
        <p>
          Account creation and authentication is handled by Clerk. You are
          responsible for maintaining the confidentiality of your credentials
          and for all activity under your account.
        </p>

        <h2>4. Acceptable Use</h2>
        <p>
          You may not use Strix to: (a) violate any applicable law; (b)
          attempt to reverse-engineer, decompile, or extract source code from
          the service; (c) conduct load testing or automated scraping without
          prior written consent; or (d) transmit malware, spam, or harmful
          content.
        </p>

        <h2>5. Intellectual Property</h2>
        <p>
          All content, trademarks, and software comprising the Strix service
          are owned by or licensed to us. The governance engine demonstrated
          here is proprietary. Nothing in these terms grants you a license to
          our intellectual property.
        </p>

        <h2>6. Disclaimer of Warranties</h2>
        <p>
          The service is provided "as is" without warranty of any kind, express
          or implied. We do not warrant that the service will be uninterrupted,
          error-free, or fit for any particular purpose.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, we shall not be
          liable for any indirect, incidental, special, or consequential damages
          arising out of or in connection with your use of the service.
        </p>

        <h2>8. Changes to These Terms</h2>
        <p>
          We may update these terms at any time. We will indicate the "last
          updated" date above. Continued use of the service after changes
          constitutes acceptance of the new terms.
        </p>

        <h2>9. Contact</h2>
        <p>
          Questions? Email{' '}
          <a href="mailto:hello@strixgov.com">hello@strixgov.com</a>.
        </p>
      </div>
    </div>
  );
}
