import { useEffect } from 'react';
import { pushBackHandler } from '../lib/backStack';
import { X } from 'lucide-react';

const TERMS = `
TERMS OF SERVICE
Last updated: May 2026

1. ACCEPTANCE OF TERMS
By downloading or using the Kabutar mobile application ("App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree, do not use the App. Kabutar ("we", "our", "us") is a peer-to-peer parcel delivery marketplace operated in India.

2. DESCRIPTION OF SERVICE
Kabutar is a technology platform that connects individuals who are travelling ("Travellers") with individuals who need to send parcels ("Senders") on the same route. Kabutar does not itself provide delivery or courier services. We are a marketplace — all delivery arrangements are between Travellers and Senders directly.

3. ELIGIBILITY
You must be at least 18 years of age to use Kabutar. By using the App, you confirm you are 18 or older and legally capable of entering into a binding agreement under Indian law.

4. KYC VERIFICATION
Travellers must complete KYC (Know Your Customer) verification before posting trips. KYC may include government-issued photo ID and a live selfie. Kabutar reserves the right to reject or revoke KYC status at its discretion. Senders are encouraged but not required to complete KYC.

5. USER RESPONSIBILITIES
You agree to:
• Provide accurate, complete, and current information
• Keep your account credentials confidential
• Not impersonate any person or misrepresent your identity
• Use the App only for lawful purposes
• Treat all other users with respect and dignity

6. TRAVELLER RESPONSIBILITIES
As a Traveller, you agree to:
• Carry only parcels you have inspected and accepted
• Deliver parcels safely and on time as agreed
• Not carry prohibited items (see Section 8)
• Communicate promptly with Senders via in-app chat
• Upload photo proof at pickup and delivery

7. SENDER RESPONSIBILITIES
As a Sender, you agree to:
• Accurately describe parcel contents, weight, and dimensions
• Declare the true value of parcels
• Not send prohibited items (see Section 8)
• Have parcels ready at the agreed pickup time
• Make payment as agreed with the Traveller

8. PROHIBITED ITEMS
You must not send or carry any of the following:
• Cash, currency, or negotiable instruments
• Illegal drugs or controlled substances
• Weapons, ammunition, or explosives
• Counterfeit goods or stolen property
• Perishable food items without prior agreement
• Flammable, hazardous, or toxic materials
• Live animals
• Adult content or obscene material
• Any item prohibited under Indian law

Violation may result in immediate account termination and legal action.

9. PAYMENTS
All payment arrangements are made directly between Travellers and Senders. Kabutar does not process, hold, or guarantee any payments. Users are responsible for agreeing on fair prices and completing payment as mutually agreed.

10. RATINGS AND REVIEWS
After each delivery, both parties may rate each other. Ratings affect user visibility on the platform. Fake, misleading, or abusive reviews are prohibited and may result in account suspension.

11. CANCELLATION POLICY
Cancellations should be communicated as early as possible via in-app chat. Repeated no-shows or last-minute cancellations may result in account penalties or suspension.

12. LIMITATION OF LIABILITY
To the maximum extent permitted by applicable law:
• Kabutar is not liable for loss, damage, or theft of parcels
• Kabutar does not guarantee the quality, safety, or legality of items carried
• Kabutar's aggregate liability to any user shall not exceed ₹5,000
• We are not liable for indirect, incidental, or consequential damages

13. ACCOUNT TERMINATION
We may suspend or terminate your account at any time for violation of these Terms, fraudulent activity, or at our sole discretion with or without notice.

14. DISPUTE RESOLUTION
Any disputes between Travellers and Senders must first be attempted to be resolved amicably. If unresolved, disputes shall be subject to arbitration under the Arbitration and Conciliation Act, 1996. The seat of arbitration shall be Patna, Bihar, India.

15. GOVERNING LAW
These Terms are governed by the laws of India. Any legal proceedings shall be subject to the exclusive jurisdiction of the courts in Patna, Bihar.

16. CHANGES TO TERMS
We reserve the right to update these Terms at any time. Continued use of the App after changes constitutes acceptance of the updated Terms.

17. CONTACT
For queries regarding these Terms, contact us at:
📧 kabutar.support@gmail.com
`;

const PRIVACY = `
PRIVACY POLICY
Last updated: May 2026

Kabutar ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, share, and protect your personal information when you use our App.

1. INFORMATION WE COLLECT

1.1 Account Information
• Full name
• Mobile phone number
• Email address (if signing in with Google)
• Profile photograph

1.2 KYC Data (Travellers only)
• Government-issued photo ID (Aadhaar, PAN, Driving Licence, Passport)
• Live selfie photograph
This data is collected solely for identity verification.

1.3 Location Data
• Approximate or precise location (with your permission) for the "Near Me" filter feature only. Location is not tracked continuously.

1.4 Trip and Parcel Data
• Routes, dates, weights, item descriptions, photos uploaded at pickup/delivery

1.5 Device and Usage Data
• Device model, OS version
• App usage patterns, crash reports
• Firebase Cloud Messaging token (for push notifications)

1.6 Communications
• In-app chat messages between users

2. HOW WE USE YOUR INFORMATION
• To create and manage your account
• To verify identity via KYC
• To match Travellers with Senders on the same route
• To facilitate in-app messaging between users
• To send push notifications about trip/parcel updates
• To improve the App and prevent fraud
• To comply with legal obligations

3. INFORMATION SHARING
We do not sell your personal data. We may share information with:
• Other users: Your name, city, rating, and KYC status are visible to other users you interact with. Your full phone number is never shown — we display a masked version.
• Firebase (Google): For authentication and push notifications
• Service providers: Cloud hosting, analytics (with data processing agreements)
• Law enforcement: When required by law or court order

4. KYC DATA
KYC documents are stored securely and encrypted. They are used only for identity verification and are not shared with third parties except where required by law. You may request deletion of KYC data by contacting us.

5. PUSH NOTIFICATIONS
We send push notifications for parcel updates, trip matches, and system alerts. You can disable notifications at any time in your device settings.

6. DATA SECURITY
We implement industry-standard security measures including:
• HTTPS encryption for all data in transit
• Encrypted storage of sensitive data
• Access controls and authentication
However, no system is 100% secure. Use the App at your own risk.

7. DATA RETENTION
• Account data: Retained for the duration of your account + 3 years after deletion for legal compliance
• KYC data: Retained as required by applicable Indian regulations
• Chat messages: Retained for 1 year
• Deleted account data: Purged from our systems within 90 days of confirmed deletion

8. CHILDREN'S PRIVACY
Kabutar is not intended for users under 18 years of age. We do not knowingly collect data from minors.

9. YOUR RIGHTS
You have the right to:
• Access your personal data
• Correct inaccurate data (via Profile settings)
• Request deletion of your account and data
• Withdraw consent for location access (via device settings)
• Opt out of marketing communications

To exercise these rights, contact us at kabutar.support@gmail.com

10. COOKIES AND TRACKING
The App does not use browser cookies. We use Firebase Analytics for anonymous usage statistics.

11. CHANGES TO THIS POLICY
We may update this Privacy Policy periodically. We will notify you of significant changes via the App. Continued use constitutes acceptance.

12. GRIEVANCE OFFICER
In accordance with the Information Technology Act, 2000 and rules made thereunder, the name and contact details of the Grievance Officer are:

Name: Kabutar Support Team
Email: kabutar.support@gmail.com
Response time: Within 30 days of receipt of complaint

13. CONTACT US
For any privacy-related queries:
📧 kabutar.support@gmail.com

Kabutar | Made with ♥ in India
`;

export default function LegalModal({ type, onClose }) {
  const isTerms = type === 'terms';
  const content = isTerms ? TERMS : PRIVACY;
  const title   = isTerms ? 'Terms of Service' : 'Privacy Policy';

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const unregisterBack = pushBackHandler(() => onClose?.());
    return () => { document.body.style.overflow = ''; unregisterBack(); };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-white animate-slide-up font-inter"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-14 border-b border-slate-200 shrink-0 bg-white">
        <button onClick={onClose} aria-label="Close"
          className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-slate-700 active:bg-slate-100 hover:bg-slate-100">
          <X size={20} />
        </button>
        <h2 className="text-[17px] font-semibold text-slate-900">{title}</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        {content.trim().split('\n').map((line, i) => {
          const trimmed = line.trim();
          if (!trimmed) return <div key={i} className="h-3" />;
          // Section headings (ALL CAPS numbered)
          if (/^\d+\.\s+[A-Z\s&']+$/.test(trimmed) || /^[A-Z\s&']{4,}$/.test(trimmed)) {
            return (
              <p key={i} className="text-[14px] font-semibold text-slate-900 mt-6 mb-2">
                {trimmed}
              </p>
            );
          }
          // Sub-headings (1.1, 1.2 …)
          if (/^\d+\.\d+\s/.test(trimmed)) {
            return <p key={i} className="text-[14px] font-semibold text-slate-800 mt-3 mb-1">{trimmed}</p>;
          }
          // Bullet points
          if (trimmed.startsWith('•')) {
            return (
              <p key={i} className="text-[14px] text-slate-600 leading-relaxed pl-3 mb-0.5">
                {trimmed}
              </p>
            );
          }
          // Regular paragraph
          return <p key={i} className="text-[14px] text-slate-600 leading-relaxed mb-1">{trimmed}</p>;
        })}
        <div className="h-8" />
      </div>
    </div>
  );
}
