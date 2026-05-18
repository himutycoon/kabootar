import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Introduction',
    body: `Kabutar ("we", "our", or "us") is committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, store, and share your information when you use our platform at kabutar.in or via the Kabutar Android app.

By using Kabutar, you consent to the data practices described in this policy. If you do not agree with this policy, please discontinue use of our services.`,
  },
  {
    title: '2. Information We Collect',
    body: `We collect the following categories of information:

Account Information
• Full name and display name
• Mobile phone number (verified via OTP)
• Email address (if signing in with Google)
• Profile photograph (optional, uploaded by you)
• Home city or location (optional)

KYC Documents (for verified users only)
• Government-issued ID (Aadhaar, PAN, Driving Licence, or Passport)
• Selfie photograph for identity matching

Trip and Parcel Data
• Origin and destination cities
• Travel dates, transport mode, and schedule
• Parcel details including weight, type, and description
• Pricing information

Communication Data
• In-app chat messages between Travelers and Senders
• Ratings and reviews you submit

Usage Data
• Device type and operating system
• App usage patterns and navigation data
• Push notification tokens
• Crash reports and error logs`,
  },
  {
    title: '3. How We Use Your Information',
    body: `We use the information we collect to:
• Create and manage your Kabutar account
• Verify your identity via OTP and KYC processes
• Match Travelers with Senders on matching routes
• Enable in-app chat between users
• Display your public profile, rating, and verification status
• Send push notifications about trip matches, messages, and delivery updates
• Investigate reports of abuse, fraud, or safety violations
• Improve the platform through analytics and bug fixing
• Comply with legal obligations

We do not sell your personal information to third parties.`,
  },
  {
    title: '4. KYC Documents',
    body: `KYC documents (ID proofs and selfies) are:
• Stored securely on Google Firebase Storage with restricted access
• Accessible only to Kabutar administrators for verification purposes
• Never shared with other users or third parties
• Retained for the duration of your account and deleted upon account deletion

KYC documents are processed manually by our verification team and are not used for any purpose other than identity verification.`,
  },
  {
    title: '5. Firebase and Google Services',
    body: `Kabutar uses several Google Firebase services to operate the platform:

Firebase Authentication
Used for phone OTP login and Google Sign-In. Firebase processes your phone number and authentication credentials.

Firebase Storage
Used to store profile images and KYC documents securely.

Firebase Cloud Messaging (FCM)
Used to send push notifications to your device. FCM requires a device registration token which is stored on our servers.

Firebase Analytics (if applicable)
Collects anonymised usage data to help us understand how the app is used.

Google's data practices are governed by the Google Privacy Policy available at https://policies.google.com/privacy.`,
  },
  {
    title: '6. Information Sharing',
    body: `We share your information only in the following circumstances:

With Other Users
Your public profile information (name, profile photo, rating, verification status, active trips) is visible to other Kabutar users to facilitate the matching process. Your phone number and KYC documents are never shared with other users.

With Service Providers
We may share data with trusted third-party service providers (such as Firebase/Google) who assist us in operating the platform. These providers are contractually bound to protect your data.

For Legal Compliance
We may disclose your information if required by law, court order, or to protect the rights and safety of Kabutar, our users, or the public.

Business Transfers
In the event of a merger, acquisition, or sale of assets, your data may be transferred to the acquiring entity, subject to the same privacy protections.`,
  },
  {
    title: '7. Data Retention',
    body: `We retain your personal information for as long as your account is active or as needed to provide services. Specifically:
• Account data is retained until you request deletion
• Chat messages are retained to maintain conversation history
• KYC documents are deleted upon account deletion
• Analytics data is retained in anonymised form for up to 12 months

After account deletion, certain data may be retained for up to 90 days in backup systems before being permanently erased.`,
  },
  {
    title: '8. Data Security',
    body: `We implement appropriate technical and organisational measures to protect your personal information against unauthorised access, alteration, disclosure, or destruction. These include:
• HTTPS encryption for all data in transit
• Firebase security rules restricting access to sensitive data
• OTP-based authentication to prevent unauthorised account access
• Restricted admin access to KYC documents

However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security of your data.`,
  },
  {
    title: '9. Your Rights',
    body: `You have the following rights regarding your personal data:

Access
You may request a copy of the personal data we hold about you by contacting us at kabutar.support@gmail.com.

Correction
You may update your profile information directly within the app at any time.

Deletion
You may request deletion of your account via Profile → Delete Account. Your account will be permanently deleted within 3 days of the request if you do not log back in.

Opt-out of Notifications
You may disable push notifications at any time via your device settings.

Data Portability
Upon request, we will provide your data in a machine-readable format where technically feasible.`,
  },
  {
    title: '10. Children\'s Privacy',
    body: `Kabutar is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child under 18 has provided us with personal information, we will take steps to delete such information promptly.

If you believe your child has provided us with personal information, please contact us at kabutar.support@gmail.com.`,
  },
  {
    title: '11. Third-Party Links',
    body: `Our platform may contain links to third-party websites or services (such as IRCTC for PNR verification or Flightradar24 for flight tracking). These third-party sites have their own privacy policies and we are not responsible for their practices. We encourage you to review the privacy policies of any third-party services you visit.`,
  },
  {
    title: '12. Push Notifications',
    body: `With your permission, we may send push notifications to your device regarding:
• New parcel requests matching your posted trip
• New trip matches for your parcel request
• Chat messages from other users
• Delivery confirmations and status updates
• Platform announcements and updates

You can opt out of push notifications at any time via your device's notification settings or from the app settings.`,
  },
  {
    title: '13. Cookies and Tracking',
    body: `The Kabutar web app (kabutar.in) may use browser local storage and session storage to maintain your login session and preferences. We do not use third-party advertising cookies. We may use Google Analytics to collect anonymised usage data to improve our services.`,
  },
  {
    title: '14. Changes to This Policy',
    body: `We may update this Privacy Policy from time to time to reflect changes in our practices or for other operational, legal, or regulatory reasons. We will notify you of any material changes via in-app announcement or push notification. The "Last updated" date at the top of this page will reflect when the policy was last revised.

Your continued use of Kabutar after any changes constitutes your acceptance of the updated policy.`,
  },
  {
    title: '15. Grievance Officer',
    body: `In accordance with the Information Technology Act, 2000, and the rules made thereunder, the name and contact details of our Grievance Officer are:

Name: Kabutar Support Team
Email: kabutar.support@gmail.com
Response time: Within 30 days of receipt of complaint

If you have any privacy-related concerns or complaints, please reach out to us using the contact details above.`,
  },
];

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-5 h-14 flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-stone-100 transition-colors text-stone-600">
            <ArrowLeft size={18} />
          </button>
          <span className="font-bold text-stone-900 text-sm">Privacy Policy</span>
          <span className="ml-auto text-xs text-stone-400">Last updated: January 2025</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 pb-16">
        {/* Hero */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl">🔐</div>
            <div>
              <h1 className="font-black text-stone-900 text-lg">Privacy Policy</h1>
              <p className="text-xs text-stone-400">Kabutar · kabutar.in</p>
            </div>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">
            Your privacy matters to us. This policy describes what data we collect, how we use it, and the choices you have.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <h2 className="font-bold text-stone-900 text-sm mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                {s.title}
              </h2>
              <p className="text-sm text-stone-500 leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <div className="mt-6 text-center text-xs text-stone-400 space-y-1">
          <p>© 2025 Kabutar. All rights reserved.</p>
          <p>
            <button onClick={() => navigate('/terms')} className="text-orange-500 hover:underline">Terms &amp; Conditions</button>
            {' · '}
            <a href="mailto:kabutar.support@gmail.com" className="text-orange-500 hover:underline">Contact Us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
