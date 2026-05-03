import { Share, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "@/context/AuthContext";

const PENDING_REF_KEY = "@zero_club/pending_ref";
const PENDING_REDIRECT_KEY = "@zero_club/pending_redirect";

export type PendingRedirect =
  | { type: "bootcamp"; id: string }
  | { type: "post"; id: string }
  | null;

export async function storePendingShare(ref: string | null, redirect: PendingRedirect) {
  if (ref) await AsyncStorage.setItem(PENDING_REF_KEY, ref);
  if (redirect) await AsyncStorage.setItem(PENDING_REDIRECT_KEY, JSON.stringify(redirect));
}

export async function consumePendingRef(): Promise<string | null> {
  const ref = await AsyncStorage.getItem(PENDING_REF_KEY);
  if (ref) await AsyncStorage.removeItem(PENDING_REF_KEY);
  return ref;
}

export async function consumePendingRedirect(): Promise<PendingRedirect> {
  const raw = await AsyncStorage.getItem(PENDING_REDIRECT_KEY);
  if (raw) {
    await AsyncStorage.removeItem(PENDING_REDIRECT_KEY);
    try { return JSON.parse(raw) as PendingRedirect; } catch { return null; }
  }
  return null;
}

export function useShare() {
  const { user } = useAuth();

  const getBaseUrl = () => {
    const domain = process.env["EXPO_PUBLIC_DOMAIN"];
    return domain ? `https://${domain}` : (Platform.OS === "web" ? "" : "");
  };

  const shareBootcamp = async (bootcampId: string, bootcampTitle: string) => {
    const ref = user?.referralCode ?? "";
    const base = getBaseUrl();
    const url = `${base}/share/bootcamp/${bootcampId}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
    try {
      await Share.share({
        title: `Join "${bootcampTitle}" on Zero Club`,
        message: `🎯 Check out "${bootcampTitle}" on Zero Club — Africa's private club for builders.\n\n${url}`,
        url,
      });
    } catch {
      // user dismissed
    }
  };

  const sharePost = async (postId: string, postBody: string) => {
    const ref = user?.referralCode ?? "";
    const base = getBaseUrl();
    const url = `${base}/share/post/${postId}${ref ? `?ref=${encodeURIComponent(ref)}` : ""}`;
    const preview = postBody.length > 100 ? postBody.slice(0, 97) + "…" : postBody;
    try {
      await Share.share({
        title: "Zero Club — Check this build",
        message: `💡 "${preview}"\n\nSee more on Zero Club — Africa's private club for builders.\n\n${url}`,
        url,
      });
    } catch {
      // user dismissed
    }
  };

  return { shareBootcamp, sharePost };
}
