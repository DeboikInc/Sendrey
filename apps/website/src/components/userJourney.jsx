'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'
import {
  IoPersonAddOutline,
  IoDocumentTextOutline,
  IoAppsOutline,
  IoKeypadOutline,
  IoWalletOutline,
  IoChatbubblesOutline,
  IoLocationSharp,
  IoCheckmarkCircleOutline,
  IoStarOutline,
  IoAlertCircleOutline,
  IoCallOutline,
  IoCloseCircleOutline,
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
    title: 'Create your account',
    text: 'Sign up with your details in a couple of minutes.',
    image: '/user-register.png',
  },
  {
    icon: IoDocumentTextOutline,
    title: 'Accept the terms',
    text: 'Review and accept Sendrey\u2019s terms before your first order.',
    image: '/user-terms.png',
  },
  {
    icon: IoAppsOutline,
    title: 'Choose your service',
    text: 'Pick Pickup for a delivery, or Run an Errand for tasks like a market run or a queue.',
    image: '/user-select-service.png',
  },
  {
    icon: IoKeypadOutline,
    title: 'Set your transaction PIN',
    text: 'A PIN secures your wallet and authorizes payments on your account.',
    image: '/user-set-pin.png',
  },
  {
    icon: IoKeypadOutline,
    title: 'Confirm Your Order',
    text: 'Confirm all your order and edit if you made mistakes.',
    image: '/confirm-order.png',
  },
  {
    icon: IoChatbubblesOutline,
    title: 'Get matched with a runner',
    text: 'A verified runner nearby accepts your order and opens a chat with you.',
    image: '/connect-to-runner.png',
  },
  {
    icon: IoWalletOutline,
    title: 'Fund your order',
    text: 'Pay from your Sendrey wallet or with a card. Every wallet transaction is logged, so you always have a clear record of what you\u2019ve spent.',
    image: '/fund-order.png',
  },
  {
    icon: IoLocationSharp,
    title: 'Track your runner live',
    text: 'A tracker runs alongside your chat, and status updates keep you posted as things happen \u2014 like your runner arriving at the pickup or market location.',
    image: '/track-runner.png',
  },
  {
    icon: IoCheckmarkCircleOutline,
    title: 'Confirm your delivery',
    text: 'When your runner delivers, you\u2019ll get a confirmation prompt right in the chat.',
    image: '/confirm-delivery.png',
    callout: {
      icon: IoCloseCircleOutline,
      text: 'Item not delivered? Reject it in the same prompt. A runner is banned after 3 rejected attempts.',
    },
  },
  {
    icon: IoStarOutline,
    title: 'Rate your runner',
    text: 'Once the order is complete, let us know how it went.',
    image: '/order-completed.png',
  },
]

const alwaysOn = [
  {
    icon: IoCallOutline,
    title: 'In-app calls',
    text: 'Reach your runner by audio or video call, right from the order chat.',
  },
  {
    icon: IoAlertCircleOutline,
    title: 'Raise a dispute',
    text: 'Available while an order is in progress, and for 48 hours after it\u2019s completed.',
  },
  {
    icon: IoWalletOutline,
    title: 'Wallet transparency',
    text: 'Every transaction is recorded, so your spending history is always visible to you.',
  },
]

const isRealImage = (src) => src.startsWith('/') || src.startsWith('http')

export const UserJourney = () => {
  return (
    <section id="user-journey" className="bg-white py-20 px-4 sm:px-6 scroll-mt-24">
      <div className="max-w-screen-md mx-auto">
        <motion.div {...fadeUp} className="text-center space-y-3 mb-16">
          <h6 className="text-primary font-semibold uppercase tracking-wide text-sm">
            For users
          </h6>
          <h2 className="text-2xl sm:text-3xl font-bold text-secondary">
            Your order, from start to finish
          </h2>
          <p className="text-gray-800 leading-relaxed max-w-lg mx-auto">
            Here&rsquo;s exactly what happens between opening the app and getting
            your delivery confirmed.
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

                  {isRealImage(image) ? (
                    <div className="mt-4 w-full max-w-sm overflow-hidden rounded-sm border border-gray-1002 bg-gray-1000">
                      <Image
                        src={image}
                        alt={title}
                        width={800}
                        height={600}
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
            Along the way, you&rsquo;re always covered
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