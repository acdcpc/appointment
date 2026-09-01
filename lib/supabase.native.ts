// Native-only entry: Metro resolves lib/supabase.native.ts instead of
// lib/supabase.ts on iOS/Android. React Native lacks the full WHATWG URL
// implementation, so the polyfill must run before the Supabase client is
// created. Web builds resolve lib/supabase.ts and skip this entirely.
import "react-native-url-polyfill/auto";

export * from "./supabase";
