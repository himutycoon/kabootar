import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: `By accessing or using the Kabutar platform (website at kabutar.in or the Android app), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use our services.

Kabutar is a peer-to-peer parcel delivery platform that connects travelers with spare luggage space to individuals who need to send parcels between cities in India. We act solely as an intermediary and are not a licensed logistics or courier company.`,
  },
  {
    title: '2. Eligibility',
    body: `To use Kabutar you must:
• Be at least 18 years of age
• Be a resident of India
• Provide a valid Indian mobile number for OTP verification
• Agree to complete KYC (Know Your Customer) verification when requested
• Not be prohibited from using the platform under applicable law

By using Kabutar, you represent and warrant that you meet all of the above eligibility requirements.`,
  },
  {
    title: '3. User Accounts',
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to:
• Provide accurate, current, and complete information during registration
• Keep your profile information up to date
• Notify us immediately of any unauthorised use of your account
• Not share your account with any other person

Kabutar reserves the right to suspend or terminate accounts that violate these terms.`,
  },
  {
    title: '4. KYC Verification',
    body: `For enhanced trust and safety, we require KYC verification for users who wish to post trips or carry parcels. KYC involves:
• Submission of a valid government-issued ID (Aadhaar Card, PAN Card, Driving Licence, or Passport)
• A selfie for identity matching
• Phone number verification via OTP

Documents submitted for KYC are stored securely on Firebase Storage and used solely for identity verification purposes. KYC-verified users receive a blue verified badge on their profile.`,
  },
  {
    title: '5. Traveler Responsibilities',
    body: `If you use Kabutar as a Traveler (carrying parcels), you agree to:
• Only carry parcels that comply with applicable laws and these Terms
• Accurately describe your available capacity, route, and timing
• Collect and deliver parcels safely and on time as agreed with the Sender
• Not open, tamper with, or inspect the contents of any sealed parcel
• Confirm delivery via the in-app OTP system
• Rate the Sender honestly after each transaction

You are solely responsible for the parcels you agree to carry. Kabutar is not liable for any loss, damage, or delay caused during transit.`,
  },
  {
    title: '6. Sender Responsibilities',
    body: `If you use Kabutar as a Sender, you agree to:
• Only send items that are legal, safe, and allowed under these Terms
• Accurately describe parcel contents, weight, and dimensions
• Pack parcels securely to prevent damage during transit
• Be available to hand over the parcel at the agreed time and location
• Confirm receipt via the in-app OTP system
• Rate the Traveler honestly after each transaction

You are responsible for ensuring that the items you send are legal and properly declared.`,
  },
  {
    title: '7. Prohibited Items',
    body: `The following items are strictly prohibited on Kabutar. Sending or carrying these items may result in immediate account suspension and legal action:
• Narcotics, controlled substances, or illegal drugs
• Weapons, firearms, ammunition, or explosives
• Counterfeit currency or financial instruments
• Stolen goods or items of suspicious origin
• Live animals or prohibited wildlife products
• Hazardous, flammable, or toxic materials
• Unlicensed pharmaceutical products
• Human organs or biological specimens
• Pornographic material
• Any item prohibited under Indian law

Kabutar reserves the right to report suspicious activities to relevant authorities.`,
  },
  {
    title: '8. Payments and Pricing',
    body: `All pricing on Kabutar is set directly between Travelers and Senders through in-app negotiation. Kabutar does not currently charge a platform fee or process payments between users. Any financial transactions made directly between users are their sole responsibility.

Kabutar is not responsible for any disputes arising from payments made outside the platform. We strongly recommend users agree on prices in writing via in-app chat before proceeding.`,
  },
  {
    title: '9. Ratings and Reviews',
    body: `After each completed transaction, both Travelers and Senders are required to rate each other. Ratings are displayed publicly on user profiles and contribute to the trust score visible to all users.

You agree to:
• Submit honest and accurate ratings
• Not engage in rating manipulation or fraudulent reviews
• Not threaten other users in connection with ratings

Kabutar may remove ratings that violate these guidelines.`,
  },
  {
    title: '10. Safety and Conduct',
    body: `You agree to:
• Interact with other users respectfully and professionally
• Not harass, threaten, or abuse other users
• Not misrepresent your identity or the contents of any parcel
• Report suspicious or unsafe behaviour using the in-app Report system
• Meet counterparties only in safe, public locations (railway stations, airports, bus stands)
• Not share personal financial details (bank account, UPI PIN, OTP) with other users

Kabutar provides a Report and Block feature. Misuse of the platform may result in suspension or permanent ban.`,
  },
  {
    title: '11. Limitation of Liability',
    body: `Kabutar acts as an intermediary platform and is not liable for:
• Loss, theft, damage, or delay of any parcel during transit
• Disputes between Travelers and Senders
• Financial losses arising from transactions between users
• Inaccurate information provided by users
• Technical failures, downtime, or service interruptions

To the maximum extent permitted by applicable law, Kabutar's total liability for any claim shall not exceed ₹1,000 (Indian Rupees One Thousand).`,
  },
  {
    title: '12. Intellectual Property',
    body: `All content on the Kabutar platform — including the logo, name, design, text, graphics, and software — is the intellectual property of Kabutar and is protected under applicable Indian copyright and trademark laws. You may not reproduce, distribute, or create derivative works without our written permission.`,
  },
  {
    title: '13. Account Deletion',
    body: `You may request deletion of your account at any time from the Profile → Delete Account section of the app. Upon request:
• Your account will be marked for deletion
• If you do not log in within 3 days of the request, your account and data will be permanently deleted
• Logging back in within 3 days will automatically cancel the deletion request

Some data may be retained as required by law or for legitimate business purposes.`,
  },
  {
    title: '14. Changes to Terms',
    body: `Kabutar reserves the right to update these Terms and Conditions at any time. Material changes will be notified via in-app announcement. Continued use of the platform after any such changes constitutes your acceptance of the new terms.`,
  },
  {
    title: '15. Governing Law',
    body: `These Terms and Conditions are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in India. If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full effect.`,
  },
  {
    title: '16. Contact Us',
    body: `For any questions, concerns, or legal notices regarding these Terms, please contact us at:

Email: kabutar.support@gmail.com

We will endeavour to respond to all queries within 5 working days.`,
  },
];

export default function TermsPage() {
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
          <span className="font-bold text-stone-900 text-sm">Terms &amp; Conditions</span>
          <span className="ml-auto text-xs text-stone-400">Last updated: January 2025</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-5 py-8 pb-16">
        {/* Hero */}
        <div className="bg-white rounded-2xl border border-stone-100 p-6 mb-6 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center text-xl">🕊️</div>
            <div>
              <h1 className="font-black text-stone-900 text-lg">Terms &amp; Conditions</h1>
              <p className="text-xs text-stone-400">Kabutar · kabutar.in</p>
            </div>
          </div>
          <p className="text-sm text-stone-500 leading-relaxed">
            These Terms and Conditions govern your use of the Kabutar platform. Please read them carefully before using our services.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {SECTIONS.map((s) => (
            <div key={s.title} className="bg-white rounded-2xl border border-stone-100 p-5 shadow-sm">
              <h2 className="font-bold text-stone-900 text-sm mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
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
            <button onClick={() => navigate('/privacy')} className="text-orange-500 hover:underline">Privacy Policy</button>
            {' · '}
            <a href="mailto:kabutar.support@gmail.com" className="text-orange-500 hover:underline">Contact Us</a>
          </p>
        </div>
      </div>
    </div>
  );
}
