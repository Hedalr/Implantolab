export type PushPlatform = "ios" | "android";

export type PushNotificationData = {
  type:
    | "new_request"
    | "request_reply"
    | "new_actualite"
    | "admin_announcement";
  requestId?: string;
};

export type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: PushNotificationData;
  sound?: "default" | null;
};

export type PushTokenRow = {
  token: string;
  profile_id: string;
};

/** Ligne INSERT webhook `requests` (champs utiles au push). */
export type RequestPushRecord = {
  id: string;
  subject: string;
  patient_name: string | null;
  sector_id: string | null;
  [key: string]: unknown;
};

/** Ligne INSERT webhook `request_messages` (champs utiles au push). */
export type MessagePushRecord = {
  request_id: string;
  sender_id: string;
  body: string;
  [key: string]: unknown;
};
