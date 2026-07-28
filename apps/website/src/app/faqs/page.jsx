import { Accordion } from "@/components/accordion";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/button";
import { RiCustomerService2Fill } from "react-icons/ri";

const customerFaqs = [
  {
    id: "c1",
    title: "What is Sendrey?",
    content:
      "Sendrey is an on-demand errand platform that connects you with trusted runners who can shop, pick up, deliver, queue, and complete everyday tasks on your behalf.",
  },
  {
    id: "c2",
    title: "How does Sendrey work?",
    content:
      "Create a task, fund it securely, get matched with a verified runner, track the progress in real time, and confirm completion before payment is released.",
  },
  {
    id: "c3",
    title: "Are Sendrey runners verified?",
    content:
      "Yes. Every runner undergoes a verification process before they can accept and complete tasks on the platform.",
  },
  {
    id: "c4",
    title: "Is my payment secure?",
    content:
      "Yes. Your payment is held securely until your task is successfully completed, ensuring protection for both customers and runners.",
  },
  {
    id: "c5",
    title: "How are delivery fees calculated?",
    content:
      "Delivery fees are calculated based on the pickup and drop-off distance, task type, fleet type, and other applicable service factors.",
  },
  {
    id: "c6",
    title: "Can I track my errand?",
    content:
      "Yes. You can monitor your task in real time and receive updates from acceptance through completion.",
  },
  {
    id: "c7",
    title: "What happens if my runner can't complete the task?",
    content:
      "If your runner is unable to complete your task, we'll notify you immediately and assign another verified runner. If no replacement is available, your payment will be refunded according to our refund policy.",
  },
  {
    id: "c8",
    title: "Can I cancel my task?",
    content:
      "Yes. You can cancel a task before it has started. If work has already begun, cancellation charges may apply.",
  },
  {
    id: "c9",
    title: "How do I contact support?",
    content:
      "You can reach our support team directly through the app or by contacting us via our official support channels.",
  },
  {
    id: "c10",
    title: "What payment methods do you accept?",
    content:
      "You can fund your wallet using supported debit cards, bank transfers, and other available payment methods.",
  },
  {
    id: "c11",
    title: "Can the runner pay for items on my behalf?",
    content:
      "No. Shopping tasks must be funded before the runner begins purchasing items to ensure transparency and protect everyone involved.",
  },
];

const runnerFaqs = [
  {
    id: "r1",
    title: "How do I become a Sendrey Runner?",
    content:
      "Sign up through the Sendrey app, complete the required verification and mandatory training, and once approved, you'll be able to start accepting tasks.",
  },
  {
    id: "r2",
    title: "Do I need a vehicle to become a runner?",
    content:
      "No. You may complete tasks on foot or use a bicycle, motorcycle, or car.",
  },
  {
    id: "r3",
    title: "How do I get paid?",
    content:
      "Once a task is successfully completed, your earnings are credited to your Sendrey wallet and can be withdrawn according to our payout schedule.",
  },
  {
    id: "r4",
    title: "Can I choose when I work?",
    content:
      "Yes. You're free to set your availability and accept tasks that fit your schedule.",
  },
  {
    id: "r5",
    title: "What happens if I can't complete a task?",
    content:
      "If you're unable to complete an accepted task, notify the customer through the app and cancel the task where appropriate. Repeated cancellations may affect your performance rating.",
  },
  {
    id: "r6",
    title: "Is training required?",
    content:
      "Yes. All runners must complete Sendrey's mandatory training and certification before they can begin accepting tasks.",
  },
];

export default function FaqsPage() {
  return (
    <main className="bg-gray-1000 min-h-screen">
      <Navbar />

      <header className="w-full bg-primary py-16 sm:py-24 px-4 text-center">
        <div className="max-w-screen-md mx-auto space-y-3">
          <h6 className="text-flash-white/80 font-semibold uppercase tracking-wide text-sm">
            Frequently Asked Questions
          </h6>
          <h1 className="text-3xl sm:text-5xl font-extrabold text-flash-white">
            Find answers about Sendrey
          </h1>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-24 space-y-16">
        <div>
          <h2 className="text-2xl font-bold text-secondary mb-6">
            FAQ for Customers
          </h2>
          <Accordion items={customerFaqs} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-secondary mb-6">
            FAQs for Runners
          </h2>
          <Accordion items={runnerFaqs} />
        </div>

        <div className="bg-secondary rounded-2xl px-6 sm:px-12 py-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
            <RiCustomerService2Fill className="text-primary text-3xl" />
          </div>
          <h3 className="text-2xl font-bold text-flash-white">
            Can&apos;t find an answer to your question?
          </h3>
          <p className="text-flash-white/80 max-w-md mx-auto">
            Our support team is on hand to help with anything not covered
            above.
          </p>
          <div className="flex justify-center pt-2">
            <Button href="/contact" classes="py-3 px-8 capitalize">
              Contact support
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}