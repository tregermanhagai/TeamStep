import { Link } from 'react-router-dom'
import { AppFooter } from '../components/AppFooter'

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-bg text-white">
      <div className="max-w-2xl mx-auto px-6 py-10">
        <Link to="/" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Back
        </Link>

        <h1 className="text-2xl font-bold text-white mt-6 mb-1">Privacy Policy — TeamStep</h1>
        <p className="text-slate-400 text-sm mb-8">Last updated: July 3, 2026</p>

        <p className="text-slate-300 mb-8 leading-relaxed">
          TeamStep ("we," "our," "the App") respects your privacy. This Privacy Policy explains what
          information we collect, how we use it, and the choices you have, when you use the TeamStep
          application available at https://team-step.vercel.app.
        </p>
        <p className="text-slate-300 mb-10 leading-relaxed">
          By creating an account or using TeamStep, you agree to the collection and use of
          information as described in this policy.
        </p>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">1. Information We Collect</h2>
          <p className="text-slate-300 mb-3 leading-relaxed">
            <strong className="text-white">Account information</strong>, depending on how you sign up:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1 pl-2">
            <li>Phone number (if you register via Phone)</li>
            <li>Email address (if you register via Email)</li>
            <li>Name, email address, and profile picture (if you sign in via Google)</li>
          </ul>
          <p className="text-slate-300 mb-3 leading-relaxed">
            <strong className="text-white">Usage and performance data</strong> you provide within the
            app, such as training activity, results, or other content you choose to enter.
          </p>
          <p className="text-slate-300 mb-3 leading-relaxed">
            <strong className="text-white">Technical data</strong>, collected automatically, such as
            device type, browser type, IP address, and general usage logs, used for security and to
            keep the service running reliably.
          </p>
          <p className="text-slate-300 leading-relaxed">
            We do not knowingly collect sensitive categories of personal data (e.g., health,
            financial, or biometric data) beyond what you voluntarily choose to enter as
            training-related notes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">2. How We Use Your Information</h2>
          <p className="text-slate-300 mb-3 leading-relaxed">We use the information we collect to:</p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1 pl-2">
            <li>Create and manage your account</li>
            <li>Provide and operate the core features of the app</li>
            <li>Authenticate you securely (including via Google Sign-In)</li>
            <li>Communicate with you about your account or the service</li>
            <li>Maintain the security, stability, and performance of the app</li>
            <li>Improve and develop the app's features over time</li>
          </ul>
          <p className="text-slate-300 leading-relaxed">
            We do not sell your personal information to third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">3. Third-Party Services</h2>
          <p className="text-slate-300 mb-3 leading-relaxed">
            TeamStep relies on trusted third-party providers to operate:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1 pl-2">
            <li><strong className="text-white">Supabase</strong> — database and backend infrastructure that stores account and app data</li>
            <li><strong className="text-white">Google</strong> — authentication provider, if you choose to sign in with Google</li>
            <li><strong className="text-white">Vercel</strong> — hosting provider for the application</li>
          </ul>
          <p className="text-slate-300 leading-relaxed">
            These providers may process your data solely to provide their respective services to us,
            under their own privacy and security policies.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">4. Data Retention</h2>
          <p className="text-slate-300 leading-relaxed">
            We retain your personal information for as long as your account is active, or as needed
            to provide you the service. You may request deletion of your account and associated data
            at any time (see Section 6).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">5. Cookies and Similar Technologies</h2>
          <p className="text-slate-300 leading-relaxed">
            TeamStep may use cookies or similar local storage technologies to keep you signed in and
            remember basic preferences. You can control cookies through your browser settings;
            disabling them may affect app functionality.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">6. Your Rights</h2>
          <p className="text-slate-300 mb-3 leading-relaxed">
            Depending on your location, you may have the right to:
          </p>
          <ul className="list-disc list-inside text-slate-300 mb-4 space-y-1 pl-2">
            <li>Access the personal data we hold about you</li>
            <li>Request correction of inaccurate data</li>
            <li>Request deletion of your account and data</li>
            <li>Withdraw consent at any time (this will not affect the lawfulness of processing before withdrawal)</li>
          </ul>
          <p className="text-slate-300 leading-relaxed">
            To exercise these rights, contact us using the details in Section 9.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">7. Data Security</h2>
          <p className="text-slate-300 leading-relaxed">
            We take reasonable technical and organizational measures to protect your information.
            However, no method of transmission or storage over the internet is 100% secure, and we
            cannot guarantee absolute security.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">8. Children's Privacy</h2>
          <p className="text-slate-300 leading-relaxed">
            TeamStep is not directed at children under the age of 16. We do not knowingly collect
            personal data from children. If you believe a child has provided us with personal data,
            please contact us so we can remove it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-3">9. Contact Us</h2>
          <p className="text-slate-300 mb-2 leading-relaxed">
            If you have questions about this Privacy Policy or wish to exercise your data rights, contact:
          </p>
          <p className="text-slate-300 leading-relaxed">
            <strong className="text-white">Hagai Tregerman</strong><br />
            Email:{' '}
            <a href="mailto:hagai1973@gmail.com" className="text-accent underline">
              hagai1973@gmail.com
            </a>
          </p>
        </section>

        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-3">10. Changes to This Policy</h2>
          <p className="text-slate-300 leading-relaxed">
            We may update this Privacy Policy from time to time. Changes will be posted on this page
            with an updated "Last updated" date. Continued use of the app after changes constitutes
            acceptance of the updated policy.
          </p>
        </section>
      </div>
      <AppFooter />
    </div>
  )
}
