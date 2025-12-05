import nodemailer from 'nodemailer'
import { env } from '../config/env.js'
import { scriptNotificationRepository } from '../repositories/scriptNotificationRepository.js'
import { notificationEventRepository } from '../repositories/notificationEventRepository.js'
import { scriptRepository } from '../repositories/scriptRepository.js'
import type { NotificationChannel, ScriptNotification } from '../types/script.js'

const EMAIL_CHANNEL: NotificationChannel = 'email'

let cachedTransporter: nodemailer.Transporter | null = null

const getTransporter = () => {
  if (!env.notifyEmailUser || !env.notifyEmailAppPassword) {
    return null
  }
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      service: env.notifyEmailService,
      auth: {
        user: env.notifyEmailUser,
        pass: env.notifyEmailAppPassword,
      },
    })
  }
  return cachedTransporter
}

const sendEmail = async (options: { to: string; subject: string; text: string }) => {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('[notification] Email credentials missing; skipping send')
    return false
  }
  await transporter.sendMail({
    from: env.notifyEmailUser,
    to: options.to,
    subject: options.subject,
    text: options.text,
  })
  return true
}

export const notificationService = {
  async ensureCreatorSubscription(scriptId: string, userId: string) {
    await scriptNotificationRepository.createSubscription({
      scriptId,
      userId,
      channel: EMAIL_CHANNEL,
      isAutoSubscribed: true,
    })
  },

  async listSubscribers(scriptId: string) {
    return scriptNotificationRepository.listByScript(scriptId)
  },

  async subscribeUser(scriptId: string, userId: string, channel: NotificationChannel = EMAIL_CHANNEL, options?: { auto?: boolean }) {
    return scriptNotificationRepository.createSubscription({
      scriptId,
      userId,
      channel,
      isAutoSubscribed: options?.auto ?? false,
    })
  },

  async getSubscriptionById(subscriptionId: string): Promise<ScriptNotification | null> {
    return scriptNotificationRepository.findById(subscriptionId)
  },

  async unsubscribe(subscriptionId: string, options?: { allowAuto?: boolean }) {
    const subscription = await scriptNotificationRepository.findById(subscriptionId)
    if (!subscription) {
      throw new Error('Subscription not found')
    }
    if (subscription.isAutoSubscribed && !options?.allowAuto) {
      throw new Error('Cannot remove auto-subscribed recipient')
    }
    await scriptNotificationRepository.deleteSubscription(subscriptionId)
  },

  async notifyFailure(scriptId: string, runContext: { runId: string; error: string }) {
    const script = await scriptRepository.findById(scriptId)
    if (!script) {
      throw new Error('Script not found')
    }
    const subscribers = await scriptNotificationRepository.listByScript(scriptId)
    for (const subscriber of subscribers) {
      const to = subscriber.userEmail ?? undefined
      if (!to) continue

      const subject = `[Alfred] ${script.name} failed`
      const text = `Script ${script.name} failed on run ${runContext.runId}.
Error: ${runContext.error}`

      try {
        const delivered = await sendEmail({ to, subject, text })
        const status = delivered ? 'sent' : 'failed'
        await notificationEventRepository.createEvent({
          scriptId,
          userId: subscriber.userId,
          channel: EMAIL_CHANNEL,
          status,
          error: delivered ? undefined : 'Email credentials missing',
          runContext,
        })
      } catch (error) {
        await notificationEventRepository.createEvent({
          scriptId,
          userId: subscriber.userId,
          channel: EMAIL_CHANNEL,
          status: 'failed',
          error: error instanceof Error ? error.message : String(error),
          runContext,
        })
      }
    }
  },
}
