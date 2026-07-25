'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  IoPersonAddOutline,
  IoShieldCheckmarkOutline,
  IoSchoolOutline,
  IoListOutline,
  IoChatbubblesOutline,
  IoLocationSharp,
  IoCheckmarkCircleOutline,
  IoCashOutline,
  IoAlertCircleOutline,
  IoReceiptOutline,
  IoCallOutline,
  IoStorefrontOutline,
} from 'react-icons/io5'

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
}

const journey = [
  {
    icon: IoPersonAddOutline,
    title: 'Sign up',
    text: 'Create your runner account with your details.',
    image: '/runner-register.png',
  },
  {
    icon: IoShieldCheckmarkOutline,
    title: 'Complete KYC',
    text: 'Verify your identity so users can trust every order you take on.',
    image: '/runner-verified.png',
  },
  // {
  //   icon: IoSchoolOutline,
  //   title: 'Go through training',
  //   text: 'Short training on platform practices, safe handling, and how to talk to customers.',
  //   image: 'Training module screen showing lesson progress.',
  // },
  {
    icon: IoListOutline,
    title: 'Browse and accept orders',
    text: 'Once approved, nearby orders start showing up. Each one displays the runner fee upfront, so you can accept it as is or pick a different errand if you\u2019d rather.',
    image: '/runner-browse.png',
  },
  {
    icon: IoChatbubblesOutline,
    title: 'Connect with the user',
    text: 'Accepting an order opens a chat with the user, with audio and video calls available whenever you need them.',
    image: '/connect-with-user.png',
  },
  {
    icon: IoLocationSharp,
    title: 'Follow the live map',
    text: 'The map first guides you to the pickup or market location, then automatically switches to the delivery location once you\u2019re en route.',
    image: '/runner-order-location.png',
    callout: {
      icon: IoStorefrontOutline,
      text: 'On Market Errand orders, you\u2019ll pay the vendor directly. That payment is tracked and ledgered in your payout history, with its own payout ID.',
    },
  },
  {
    icon: IoCheckmarkCircleOutline,
    title: 'Delivery confirmed',
    text: 'The user confirms the delivery from their end to close out the order.',
    image: '/runner-confirm-delivery.png',
  },
  {
    icon: IoCashOutline,
    title: 'Get paid',
    text: 'Your runner fee is released to your wallet once the order is completed. Withdrawals to your bank take up to 24 hours.',
    image: '/runner-order-reward.png',
  },
]

const alwaysOn = [
  {
    icon: IoAlertCircleOutline,
    title: 'Raise a dispute',
    text: 'Available any time during an active order, and for 48 hours after it\u2019s completed \u2014 same window as users get.',
  },
  {
    icon: IoReceiptOutline,
    title: 'Every payout is ledgered',
    text: 'Vendor payments and wallet withdrawals are each tracked with their own payout ID.',
  },
  {
    icon: IoCallOutline,
    title: 'Stay connected',
    text: 'Message or call the user directly from the order chat, any time during the run.',
  },
]

const isRealImage = (src) => src.startsWith('/') || src.startsWith('http')

export const RunnerJourney = () => {
  return (
    <section id="runner-journey" className="bg-white py-20 px-4 sm:px-6 scroll-mt-24">
      <div className="max-w-screen-md mx-auto">
        <motion.div {...fadeUp} className="text-center space-y-3 mb-16">
          <h6 className="text-primary font-semibold uppercase tracking-wide text-sm">
            For runners
          </h6>
          <h2 className="text-2xl sm:text-3xl font-bold text-secondary">
            From sign-up to your next payout
          </h2>
          <p className="text-gray-800 leading-relaxed max-w-lg mx-auto">
            Here&rsquo;s exactly what it takes to get approved and start earning
            on Sendrey.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative">
          <div
            className="absolute left-7 top-2 bottom-2 w-px bg-gray-1002 sm:left-8"
            aria-hidden="true"
          />

          <ol className="space-y-14">
            {journey.map(({ icon: Icon, title, text, image, callout }, i) => (
              <motion.li
                key={title}
                {...fadeUp}
                className="relative pl-20 sm:pl-24"
              >
                <div className="absolute left-0 top-0 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-full bg-primary/10 ring-4 ring-white">
                  <Icon className="text-primary text-2xl" />
                </div>

                <div className="space-y-3">
                  <h3 className="font-bold text-secondary">
                    <span className="text-primary">{String(i + 1).padStart(2, '0')}</span>
                    {'  '}
                    {title}
                  </h3>
                  <p className="text-gray-800 leading-relaxed">{text}</p>

                  {callout && (
                    <div className="flex items-start gap-2 rounded-lg bg-gray-1000 p-3 text-sm text-gray-800">
                      <callout.icon className="mt-0.5 shrink-0 text-primary" />
                      <span>{callout.text}</span>
                    </div>
                  )}

                  {/* Image placeholder \u2014 replace with a real screenshot */}
                  {isRealImage(image) ? (
                    <div className="mt-4 w-full max-w-sm overflow-hidden rounded-sm border border-gray-1002 bg-gray-1000">
                      <Image
                        src={image}
                        alt={title}
                        width={800}
                        height={600}
                        priority 
                        className="w-full h-auto object-contain"
                        sizes="(max-width: 640px) 100vw, 384px"
                      />
                    </div>
                  ) : (
                    <div className="mt-4 flex aspect-video w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-gray-1002 bg-gray-1000 p-4 text-center text-xs text-gray-600">
                      {image}
                    </div>
                  )}
                </div>
              </motion.li>
            ))}
          </ol>
        </div>

        {/* Always available, not part of the sequence */}
        <motion.div {...fadeUp} className="mt-20">
          <h3 className="text-center text-lg font-bold text-secondary mb-8">
            Built in, from your first order on
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {alwaysOn.map(({ icon: Icon, title, text }) => (
              <div key={title} className="text-center space-y-2">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Icon className="text-primary text-xl" />
                </div>
                <h4 className="font-bold text-secondary text-sm">{title}</h4>
                <p className="text-gray-800 text-sm">{text}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  )
}