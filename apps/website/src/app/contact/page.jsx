import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Contact } from "@/components/contact";
import { ContactInfo } from "@/components/contactInfo";

export const metadata = {
  title: "Contact Us | Sendrey",
  description:
    "Get in touch with Sendrey for support, partnerships, or general inquiries.",
};

export default function ContactUs() {
  return (
    <main className="mx-auto min-h-screen w-full">
      <Navbar />
      <ContactInfo />
      <Contact />
      <Footer />
    </main>
  );
}