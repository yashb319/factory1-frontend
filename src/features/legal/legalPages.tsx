import Link from "next/link";
import { Factory } from "lucide-react";

export const contactEmail = "official.factory.one@gmail.com";
const lastUpdated = "10 July 2026";

type Section = {
  title: string;
  body: string[];
};

type LegalPageContent = {
  title: string;
  description: string;
  sections: Section[];
};

export const legalPages = {
  privacy: {
    title: "Privacy Policy",
    description:
      "How Factory1 collects, uses, protects and retains customer, user and factory operations data.",
    sections: [
      {
        title: "Data We Collect",
        body: [
          "Factory1 collects account data such as name, email, phone number, role, organization name and login activity.",
          "Factory1 stores factory operations data entered by customers, including employees, attendance, payroll, inventory, products, bills, suppliers, customers, accounting records, import/export history and AI prompts.",
          "Factory1 may collect technical data such as browser type, device information, IP address, logs, diagnostics and usage events needed to operate and secure the service.",
        ],
      },
      {
        title: "Why We Collect Data",
        body: [
          "We collect data to provide the Factory1 SaaS service, authenticate users, enforce role-based access, generate reports, support billing, improve product quality and respond to support requests.",
          "AI prompts and module context may be processed to answer factory questions, suggest actions and assist with operations. Users should avoid entering unnecessary sensitive personal data into AI prompts.",
        ],
      },
      {
        title: "Security And Encryption",
        body: [
          "Factory1 is designed to use encrypted connections in transit through HTTPS/TLS in production deployments.",
          "Passwords are stored using one-way password hashing. Factory1 does not store plain text passwords.",
          "Access is protected through authentication, organization isolation and role-based access control.",
        ],
      },
      {
        title: "Cookies And Sessions",
        body: [
          "Factory1 may use essential cookies, browser storage or tokens required for authentication, security and session continuity.",
          "If analytics tools are introduced, they will be used to understand product usage and improve reliability.",
        ],
      },
      {
        title: "Retention, Rights And Contact",
        body: [
          "Customer business data is retained while the organization account is active, unless deletion is requested or required by law.",
          "Customers may request access, correction, export or deletion of their organization data by contacting Factory1.",
          `For privacy requests, contact ${contactEmail}.`,
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    description:
      "The terms for using Factory1 subscriptions, accounts, software, AI features and hosted services.",
    sections: [
      {
        title: "Subscription Terms",
        body: [
          "Factory1 offers plans based on employee limits, hosted AI usage and agreed commercial terms.",
          "Plan features, quotas and pricing may change based on infrastructure cost, support needs and commercial agreements. Existing customers will be notified when material changes apply.",
        ],
      },
      {
        title: "Payments And Account Responsibility",
        body: [
          "Until payment gateway integration is live, paid plan requests may be handled manually by the Factory1 team.",
          "Customers are responsible for keeping billing, owner and organization information accurate.",
          "Customers are responsible for all activity performed by users invited into their organization.",
        ],
      },
      {
        title: "Acceptable Use And Data Accuracy",
        body: [
          "Factory1 must not be used for illegal activity, unauthorized access, malware distribution, spam or abuse of AI features.",
          "Customers are responsible for verifying employee, payroll, tax, GST, inventory, accounting and billing data before business use.",
          "AI outputs are advisory and should be reviewed by the customer, accountant, HR team or business owner before relying on them.",
        ],
      },
      {
        title: "Intellectual Property",
        body: [
          "Factory1 owns the software, user interface, workflows, source code, trademarks and platform design.",
          "Customers retain ownership of business data they enter into Factory1.",
        ],
      },
      {
        title: "Limitation, Termination And Law",
        body: [
          "Factory1 is provided on a reasonable-efforts basis. To the maximum extent permitted by law, Factory1 is not liable for indirect, incidental or consequential losses.",
          "Factory1 may suspend or terminate access for non-payment, security risk, unlawful use or material breach of these terms.",
          "These terms are governed by the laws of India. Disputes will first be handled through good-faith discussion, then through courts or other agreed dispute resolution forums in India.",
        ],
      },
    ],
  },
  dpa: {
    title: "Data Processing Agreement",
    description:
      "How Factory1 processes customer business data for organizations that use the platform.",
    sections: [
      {
        title: "Roles",
        body: [
          "For customer business data, the customer is the Data Controller and Factory1 acts as the Data Processor.",
          "The customer decides what data is entered into Factory1 and who inside the organization may access it.",
        ],
      },
      {
        title: "Processing Instructions",
        body: [
          "Factory1 processes data only to provide, secure, maintain, support and improve the Factory1 service.",
          "Factory1 may process data for AI assistance, reporting, import/export, notifications, support, backups and security monitoring.",
        ],
      },
      {
        title: "GDPR Readiness",
        body: [
          "Factory1 is being designed with GDPR-friendly practices such as access control, data export, deletion workflows and processor accountability.",
          "If an EU customer requires a signed DPA, Factory1 can provide a commercial DPA during onboarding.",
        ],
      },
      {
        title: "Subprocessors And Transfers",
        body: [
          "Factory1 may use cloud hosting, email delivery, analytics, monitoring and AI providers as subprocessors.",
          "Where cross-border transfers occur, Factory1 will use reasonable safeguards appropriate to the provider and customer agreement.",
        ],
      },
      {
        title: "Security Controls",
        body: [
          "Factory1 uses authentication, role-based access, organization-level isolation, password hashing, production TLS and operational security practices.",
          "Customers should configure roles carefully and promptly remove users who no longer need access.",
        ],
      },
    ],
  },
  security: {
    title: "Security Policy",
    description:
      "Security practices for protecting factory operations, employee, payroll, billing and inventory data.",
    sections: [
      {
        title: "Application Security",
        body: [
          "Production traffic should be served over HTTPS/TLS.",
          "Passwords are stored using one-way hashing. Factory1 does not store plain text passwords.",
          "Role-based access control is used to limit access by department and responsibility.",
        ],
      },
      {
        title: "Data Protection",
        body: [
          "Factory1 separates data by organization and restricts users to their assigned organization.",
          "Backups should be maintained at the infrastructure level for production deployments.",
          "Import/export activity and operational events should be logged where supported by the module.",
        ],
      },
      {
        title: "Audit Logs And Monitoring",
        body: [
          "Factory1 is adding deeper audit logs over time for sensitive business actions such as billing, payroll, accounting and access changes.",
          "Security-relevant activity may be logged for investigation, reliability and abuse prevention.",
        ],
      },
      {
        title: "Vulnerability Reporting",
        body: [
          `Report suspected vulnerabilities to ${contactEmail} with steps to reproduce and potential impact.`,
          "Please do not access, modify, export or disclose data that does not belong to you while testing.",
        ],
      },
      {
        title: "Incident Response",
        body: [
          "If Factory1 identifies a material security incident, affected customers will be notified with available details and remediation guidance.",
          "Factory1 will work to contain, investigate and recover from incidents as quickly as reasonably possible.",
        ],
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    description:
      "How Factory1 uses essential cookies, browser storage and similar technologies.",
    sections: [
      {
        title: "Essential Cookies And Storage",
        body: [
          "Factory1 may use essential cookies, local storage or session storage to keep users logged in, remember session state and protect account access.",
          "These technologies are required for the application to function correctly.",
        ],
      },
      {
        title: "Authentication Cookies And Tokens",
        body: [
          "Authentication tokens may be stored in browser storage depending on the deployment and client application.",
          "Users should log out on shared devices and keep devices protected with operating system security controls.",
        ],
      },
      {
        title: "Analytics Cookies",
        body: [
          "Factory1 does not require analytics cookies for core operation.",
          "If analytics are introduced, they will be used to understand product usage, reliability and onboarding friction.",
        ],
      },
      {
        title: "Managing Cookies",
        body: [
          "Users can control cookies through browser settings, but blocking essential storage may prevent Factory1 from working correctly.",
        ],
      },
    ],
  },
  refunds: {
    title: "Refund & Cancellation Policy",
    description:
      "How plan cancellations, trials, monthly billing, annual billing and refund requests are handled.",
    sections: [
      {
        title: "Trial And Free Plan",
        body: [
          "The Free plan may be used for trial and small factory evaluation within plan limits.",
          "Factory1 may restrict excessive usage, abuse or automated misuse even on the Free plan.",
        ],
      },
      {
        title: "Monthly Plans",
        body: [
          "Monthly paid plans are billed for the agreed subscription month.",
          "Customers may request cancellation before the next billing cycle by contacting Factory1.",
        ],
      },
      {
        title: "Annual Plans",
        body: [
          "Annual plans may be offered with custom commercial terms.",
          "Refund eligibility for annual plans will be defined in the signed order, invoice or written agreement.",
        ],
      },
      {
        title: "Refund Eligibility",
        body: [
          "Refunds are generally not provided for completed billing periods unless required by law or agreed in writing.",
          "If a duplicate payment, billing error or failed provisioning occurs, Factory1 will review and correct the issue.",
        ],
      },
      {
        title: "Cancellation Process",
        body: [
          `To cancel, email ${contactEmail} from the owner email with organization name and requested cancellation date.`,
          "Customers should export required business data before cancellation or deletion.",
        ],
      },
    ],
  },
  retention: {
    title: "Data Retention & Deletion Policy",
    description:
      "How Factory1 retains, restores, exports and deletes organization business data.",
    sections: [
      {
        title: "Customer Ownership",
        body: [
          "Customers own their factory business data, including employees, payroll, attendance, billing, inventory, accounting, customer and supplier records.",
          "Factory1 stores and processes that data to provide the subscribed service.",
        ],
      },
      {
        title: "Retention While Active",
        body: [
          "Active organization data is retained while the account is active and required for product operation.",
          "Logs, backups and diagnostics may be retained for security, reliability and legal purposes.",
        ],
      },
      {
        title: "Deletion And Recovery State",
        body: [
          "Deleted organizations may be moved to a secure recovery state for up to 30 days before permanent deletion, unless immediate deletion is required by law or agreed in writing.",
          "During the recovery period, Factory1 may restore the organization if deletion was accidental and the verified owner requests restoration.",
        ],
      },
      {
        title: "Data Export",
        body: [
          "Customers can request or use available export features before deletion.",
          "Factory1 recommends exporting payroll, accounting, billing and employee records before closing an organization account.",
        ],
      },
      {
        title: "Permanent Deletion",
        body: [
          "After the recovery period, data may be permanently deleted from active systems. Backup copies may expire according to infrastructure backup schedules.",
          `Deletion requests can be sent to ${contactEmail}.`,
        ],
      },
    ],
  },
  acceptableUse: {
    title: "Acceptable Use Policy",
    description:
      "Rules for safe, lawful and responsible use of Factory1 and its AI-assisted features.",
    sections: [
      {
        title: "Prohibited Activities",
        body: [
          "Do not use Factory1 for illegal activity, fraud, harassment, spam, malware, unauthorized access or attempts to disrupt the service.",
          "Do not upload malicious files, attempt to bypass security controls or access another organization's data.",
        ],
      },
      {
        title: "Reverse Engineering And Abuse",
        body: [
          "Do not reverse engineer, scrape, copy or misuse Factory1 software, APIs, workflows or user interfaces except as permitted by law or written agreement.",
          "Do not overload the platform with automated requests, fake accounts or activity designed to evade plan limits.",
        ],
      },
      {
        title: "AI Feature Use",
        body: [
          "Do not use AI features to generate unlawful, harmful, abusive, deceptive or privacy-invasive content.",
          "Do not enter sensitive data into AI prompts unless it is necessary for the business task and allowed by your organization policy.",
        ],
      },
      {
        title: "Enforcement",
        body: [
          "Factory1 may suspend or restrict access where usage creates legal, security, operational or reputational risk.",
        ],
      },
    ],
  },
  sla: {
    title: "Service Level Agreement",
    description:
      "Current service level targets for Factory1. Formal SLA terms may be added for paid enterprise customers.",
    sections: [
      {
        title: "Availability Target",
        body: [
          "Factory1 aims to provide reliable service for production customers. Formal uptime guarantees are provided only where agreed in a paid commercial agreement.",
          "For early pilot and free plan users, service is provided on a reasonable-efforts basis.",
        ],
      },
      {
        title: "Backups And Recovery",
        body: [
          "Production environments should use managed database backups and infrastructure-level recovery controls.",
          "Backup frequency and recovery objectives may vary by hosting provider and customer plan.",
        ],
      },
      {
        title: "Support Response",
        body: [
          "Standard email support response target is within 24 hours.",
          "Priority onboarding and faster support may be offered for Growth and Enterprise customers.",
        ],
      },
      {
        title: "Exclusions",
        body: [
          "SLA targets do not cover customer network issues, third-party provider outages, force majeure events, customer misconfiguration or unauthorized changes.",
        ],
      },
    ],
  },
  aiUsage: {
    title: "AI Usage Policy",
    description:
      "How Factory1 AI assistance should be used for factory data, reports, suggestions and actions.",
    sections: [
      {
        title: "Advisory Only",
        body: [
          "Factory1 AI suggestions are advisory and should be reviewed by users before acting.",
          "Customers remain responsible for business, accounting, GST, HR, payroll, safety and compliance decisions.",
        ],
      },
      {
        title: "Data Sent To AI Providers",
        body: [
          "Where hosted AI is enabled, relevant prompts and limited business context may be processed by third-party AI providers to generate answers.",
          "Factory1 also uses local or rule-based responses where possible to reduce hosted AI usage and cost.",
        ],
      },
      {
        title: "Quotas And Fair Use",
        body: [
          "Hosted AI prompts are subject to plan quotas and organization-level settings.",
          "AI usage outside quotas may be limited, queued or answered using local fallback logic.",
        ],
      },
      {
        title: "User Review",
        body: [
          "Users should verify AI-generated calculations, reports, tax suggestions, HSN/GST suggestions and operational recommendations before business use.",
          "AI should not replace professional advice from accountants, lawyers, HR advisors or safety consultants.",
        ],
      },
    ],
  },
} satisfies Record<string, LegalPageContent>;

export const resourcePages = {
  about: {
    title: "About Factory1",
    description:
      "Factory1 is a SaaS operations workspace for Indian manufacturing teams.",
    sections: [
      {
        title: "What We Build",
        body: [
          "Factory1 helps small and mid-sized factories manage employees, attendance, payroll, inventory, billing, accounting, suppliers, customers and AI insights from one workspace.",
          "The product is built for practical factory teams that need ERP-like power without heavy implementation complexity.",
        ],
      },
      {
        title: "Made In Bangalore",
        body: [
          "Factory1 is made in Bangalore with a focus on Indian SME manufacturing workflows, GST needs and factory operations.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact Factory1",
    description:
      "Contact Factory1 for onboarding, pricing, support, partnerships and product questions.",
    sections: [
      {
        title: "Email Support",
        body: [
          `Email ${contactEmail} for support, onboarding, pricing or legal requests.`,
          "Usual response time is within 24 hours.",
        ],
      },
      {
        title: "Location",
        body: ["Factory1 is made in Bangalore, India."],
      },
    ],
  },
  help: {
    title: "Help Center",
    description:
      "Starter support information for Factory1 users and factory owners.",
    sections: [
      {
        title: "Getting Started",
        body: [
          "Create your organization, complete factory profile details, add departments, add employees, configure attendance, add inventory items and then start billing or payroll.",
          "Use the in-app Documentation page after login for module-by-module testing guidance.",
        ],
      },
      {
        title: "Support",
        body: [
          `For help, email ${contactEmail}. Include organization name, owner email, page URL, screenshot and steps to reproduce the issue.`,
        ],
      },
    ],
  },
  documentation: {
    title: "Documentation",
    description:
      "Public starter documentation for understanding Factory1 modules before login.",
    sections: [
      {
        title: "Core Modules",
        body: [
          "Factory1 includes employees, attendance, payroll, inventory, billing, products, suppliers, customers, accounting, import/export, AI assistant and SaaS plan controls.",
          "After login, use the in-app Documentation page for module-by-module walkthroughs and testing paths.",
        ],
      },
      {
        title: "Recommended First Setup",
        body: [
          "Complete organization settings, add departments, create employees, configure attendance, add customers and suppliers, add inventory and products, then start billing, accounting and payroll workflows.",
        ],
      },
    ],
  },
  api: {
    title: "API",
    description:
      "Factory1 API access is planned for future integrations.",
    sections: [
      {
        title: "Future Availability",
        body: [
          "Public API documentation is not available yet.",
          "Factory1 may provide APIs for accounting integrations, attendance devices, mobile apps, inventory tools and reporting once integration controls are ready.",
        ],
      },
    ],
  },
  status: {
    title: "Status Page",
    description:
      "Factory1 service status information.",
    sections: [
      {
        title: "Current Status",
        body: [
          "A public automated status page is planned for a later stage.",
          `For urgent availability concerns, contact ${contactEmail}.`,
        ],
      },
    ],
  },
} satisfies Record<string, LegalPageContent>;

export function LegalInfoPage({ page }: { page: LegalPageContent }) {
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Factory size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-950">Factory1</p>
              <p className="text-xs text-slate-500">Legal and policies</p>
            </div>
          </Link>
          <Link href="/" className="text-sm font-medium text-blue-700 hover:text-blue-900">
            Back home
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-700">Last updated: {lastUpdated}</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
            {page.title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
            {page.description}
          </p>
        </div>

        <div className="space-y-5">
          {page.sections.map((section) => (
            <section key={section.title} className="rounded-lg border bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-950">{section.title}</h2>
              <div className="mt-4 space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-7 text-slate-600">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-8 rounded-lg border border-blue-100 bg-blue-50 p-5 text-sm leading-7 text-blue-950">
          These pages are written for transparency and onboarding. Commercial
          agreements, signed DPAs or enterprise contracts may override public
          policy text where expressly agreed in writing.
        </div>
      </section>
    </main>
  );
}
