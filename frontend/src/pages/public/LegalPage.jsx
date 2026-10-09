import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import contentService from '../../services/contentService';
import { SHIPPING_POLICY_HTML, SHIPPING_POLICY_UPDATED } from '../../../../shared/shippingPolicy';
import { sanitizeHtml } from '../../lib/sanitizeHtml';

const updated = '29 September 2026';

const Section = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-bold text-[var(--store-primary)]">{title}</h2>
    <div className="space-y-3 leading-7 text-[var(--store-muted)]">{children}</div>
  </section>
);

const LegalPage = ({ type }) => {
  const privacy = type === 'privacy';
  const shipping = type === 'shipping';
  const pageTitle = shipping ? 'Shipping Policy' : privacy ? 'Privacy Policy' : 'Terms & Conditions';
  const legalSlug = shipping ? 'shipping-policy' : privacy ? 'privacy-policy' : 'terms-and-conditions';
  const [managedContent, setManagedContent] = useState({ slug: '', page: null });
  const [footer, setFooter] = useState(null);
  const managedPage = managedContent.slug === legalSlug ? managedContent.page : null;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [type]);

  useEffect(() => {
    let active = true;
    contentService.getFooterContent()
      .then((res) => {
        const data = res?.data?.footer || res?.footer || res?.data || res;
        if (active && data) setFooter(data);
      })
      .catch(() => {});

    contentService.getCmsPageBySlug(legalSlug)
      .then((response) => {
        const page = response.data?.page || response.page || null;
        if (active && page) setManagedContent({ slug: legalSlug, page });
      })
      .catch(() => {
        if (shipping) return;
        // Try short slug as fallback
        const shortSlug = privacy ? 'privacy' : 'terms';
        contentService.getCmsPageBySlug(shortSlug)
          .then((response) => {
            const page = response.data?.page || response.page || null;
            if (active && page) setManagedContent({ slug: legalSlug, page });
          })
          .catch(() => {
            // Keep the built-in legal copy as a reliable fallback until an admin publishes a replacement.
          });
      });
    return () => { active = false; };
  }, [legalSlug, privacy, shipping]);
  const contactEmail = footer?.emails?.[0]?.email || footer?.email || 'vinexus2024@gmail.com';
  const contactPhone = footer?.phoneNumbers?.[0]?.number || footer?.phone || '8003923316';
  const contactPhoneLink = contactPhone.startsWith('+') ? contactPhone : `+91${contactPhone.replace(/\D/g, '').slice(-10)}`;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
      <nav className="mb-6 text-sm text-[var(--store-primary)]" aria-label="Breadcrumb">
        <Link to="/" className="hover:underline">Home</Link> <span aria-hidden="true">›</span> {pageTitle}
      </nav>
      <header className="mb-8 border-b border-[var(--store-border)] pb-6">
        <h1 className="text-3xl font-bold text-gray-950 sm:text-4xl">{managedPage?.title || pageTitle}</h1>
        <p className="mt-2 text-sm text-[var(--store-muted)]">Last updated: {managedPage ? new Date(managedPage.updatedAt || managedPage.createdAt).toLocaleDateString('en-IN') : shipping ? SHIPPING_POLICY_UPDATED : updated}</p>
      </header>

      {managedPage || shipping ? (
        <article
          className="prose max-w-none space-y-4 text-sm leading-7 text-[var(--store-muted)] sm:text-base [&>h2]:text-xl [&>h2]:font-bold [&>h2]:text-[var(--store-primary)] [&>h3]:text-lg [&>h3]:font-semibold [&>ul]:list-disc [&>ul]:pl-6 [&>ol]:list-decimal [&>ol]:pl-6 [&_a]:text-[var(--store-primary)] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(managedPage ? managedPage.content : SHIPPING_POLICY_HTML) }}
        />
      ) : privacy ? (
        <div className="space-y-9 text-sm sm:text-base">
          <Section title="Who we are and what this covers">
            <p>Vinexus - Lead Generation &amp; Product Catalog Platform operates this online product catalogue, customer accounts, dealer registration and product enquiry service. This notice explains how we handle personal information you give us or that is generated while using the website. For privacy questions or requests, email <a href={`mailto:${contactEmail}`} className="text-[var(--store-primary)] underline">{contactEmail}</a> or call <a href={`tel:${contactPhoneLink}`} className="text-[var(--store-primary)] underline">{contactPhone}</a>.</p>
          </Section>
          <Section title="Information we collect and why">
            <ul className="list-disc space-y-2 pl-6">
              <li><strong>Account and verification:</strong> name, email address, mobile number, date of birth if you provide it, and OTP verification status to create an account, verify access, send important account messages and prevent misuse. A password credential, where used, is stored as a one-way hash. If you use Google sign-in, we receive basic profile and account identifier details needed for that sign-in.</li>
              <li><strong>Dealer verification:</strong> business or company name, organisation type, GSTIN, PAN, MSME/Udyam number, mobile and WhatsApp numbers, Aadhaar number, business address, office map coordinates and uploaded GST, Aadhaar or optional MSME documents to review dealer eligibility and manage dealer pricing. Do not upload documents unless you are applying as a dealer.</li>
              <li><strong>Shopping and enquiries:</strong> cart items, saved addresses, enquiries, requested products and related contact or delivery details to answer enquiries, prepare quotations, fulfil confirmed requests and provide support.</li>
              <li><strong>Technical and security records:</strong> IP address, browser/device information, login sessions, tokens and basic service logs to authenticate users, protect accounts, troubleshoot errors and maintain the website. If you enable push notifications, a device notification token is used to deliver them.</li>
              <li><strong>Device preferences:</strong> with your optional storage choice, wishlist and recently viewed products are saved in this browser for convenience.</li>
            </ul>
            <p>We use the information for these stated purposes and for legal or accounting obligations where applicable. We do not treat registration as consent to unrelated marketing.</p>
          </Section>
          <Section title="Browser storage and cookies">
            <p>Authentication refresh tokens, session expiry, cart contents, checkout state and your storage choice may be kept in browser local or session storage so the requested features work. When “Remember this mobile number” is selected at login, the last successfully used customer number is also saved in this browser to prefill the next login. Access tokens are used to authenticate requests. The website currently does not set advertising or analytics cookies. Optional wishlist and recently viewed history are saved only when you choose “Allow saved preferences”. Select “Essential only” to remove those optional items from this browser. You can reopen “Storage choices” from the footer at any time. Clearing browser storage may sign you out, remove the remembered number and empty your guest cart.</p>
          </Section>
          <Section title="Who may receive information">
            <p>Authorised Vinexus staff may access information needed to process accounts, dealer checks and enquiries. Service providers used for hosting, database storage, OTP/email or other message delivery, notifications, file storage and technical operations may process the information needed to provide those services. We may disclose information when required by law or to protect the service. We do not sell your personal information. A brand or manufacturer website you open through a product link has its own privacy practices.</p>
          </Section>
          <Section title="How long we keep it and how we protect it">
            <p>We keep account and enquiry records while needed to provide the service, resolve requests or meet applicable record-keeping requirements. We delete or de-identify data when it is no longer needed, subject to legal obligations and backup cycles. Login tokens expire or are revoked according to the session rules. We use access controls and technical safeguards, but no internet system can promise absolute security.</p>
          </Section>
          <Section title="Your choices and requests">
            <p>You can update some account details in your profile, change optional storage choices in the footer, or email <a href={`mailto:${contactEmail}`} className="text-[var(--store-primary)] underline">{contactEmail}</a> to request access, correction, deletion, withdrawal of consent or help with a privacy complaint. Withdrawal may mean we cannot continue features that need the relevant information; it does not undo processing already completed or records we must keep by law. We will verify a request before changing account information.</p>
          </Section>
          <Section title="Children and changes to this notice">
            <p>This website and dealer services are intended for adults. If you believe a child has submitted personal information, contact us so we can review it. We may update this notice as the service changes and will show the new date here. Material changes will be brought to users’ attention where appropriate.</p>
          </Section>
          <p className="border-t border-[var(--store-border)] pt-6">Please also read our <Link to="/terms" className="font-semibold text-[var(--store-primary)] underline">Terms & Conditions</Link>.</p>
        </div>
      ) : (
        <div className="space-y-9 text-sm sm:text-base">
          <Section title="Using Vinexus">
            <p>These terms apply to use of the Vinexus website, product catalogue, accounts, dealer registration, carts and enquiries. You must provide accurate information and use the service lawfully. By creating an account, you confirm you have read these terms and the <Link to="/privacy" className="text-[var(--store-primary)] underline">Privacy Policy</Link>. Creating an account does not waive any statutory rights.</p>
          </Section>
          <Section title="Accounts and dealer applications">
            <p>Keep your account access confidential and tell us if you suspect unauthorised use. Dealer status and dealer prices depend on review of business information and documents. We may request corrections or reject an application that cannot be verified. Do not provide someone else’s identity or business documents without authority.</p>
          </Section>
          <Section title="Products, prices and enquiries">
            <p>Product descriptions, images, availability and prices are provided for shopping and enquiry purposes and may change. Adding an item to a cart or submitting an enquiry does not by itself confirm a sale, reserve stock or fix a final price. Final product availability, taxes, delivery, payment and commercial terms should be confirmed in a quotation or order accepted by Vinexus. Please verify compatibility and specifications before confirming a purchase.</p>
          </Section>
          <Section title="Delivery, warranty and returns">
            <p>Delivery timing, charges, cancellation and return eligibility depend on the confirmed order and applicable law. Product warranty details may vary by product and manufacturer; check the product page and confirmed invoice or warranty documents. Contact Vinexus through the details in the footer for an order, return or warranty concern. Nothing here removes rights you have under applicable consumer law.</p>
          </Section>
          <Section title="Acceptable use and third-party links">
            <p>Do not interfere with the website, scrape it at unreasonable volume, attempt unauthorised access or use it for fraud. Product images, text and site design belong to their respective owners and may not be reused without permission. Links to manufacturer or other external websites take you to services with their own terms and privacy policies.</p>
          </Section>
          <Section title="Service changes and responsibility">
            <p>We may update or temporarily interrupt the website for maintenance or security. We work to keep catalogue information accurate, but errors can occur; please confirm important details before placing an order. Any limitation of responsibility applies only to the extent permitted by applicable law. These terms do not exclude rights or remedies that cannot legally be excluded.</p>
          </Section>
          <Section title="Questions and updates">
            <p>For questions or a dispute, email <a href={`mailto:${contactEmail}`} className="text-[var(--store-primary)] underline">{contactEmail}</a> or call <a href={`tel:${contactPhoneLink}`} className="text-[var(--store-primary)] underline">{contactPhone}</a>. We may revise these terms and will update the date above. Continued use after a material change may require a new acknowledgement where appropriate.</p>
          </Section>
        </div>
      )}
    </div>
  );
};

export default LegalPage;
