import 'react-native-get-random-values';
import * as React from 'react';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';

import { isNip155Url } from '@/lib/nip155';
import { subscribeToCallbacks } from '@/lib/callbacks';

type Params = Record<string, string | undefined>;

export default function RootLayout() {
  const router = useRouter();

  const navigate = React.useCallback(
    (pathname: string, params?: Params) => {
      router.push({ pathname, params } as never);
    },
    [router]
  );

  const handleUrl = React.useCallback(
    (url: string | null | undefined) => {
      if (!url) return;
      console.log('[NIP155] handleUrl', url);
      const parsed = Linking.parse(url);
      const host = ((parsed as any).host || (parsed as any).hostname || '') as string;
      const path = parsed?.path ?? '';
      const qp = (parsed.queryParams ?? {}) as Record<string, unknown>;

      const toString = (value: unknown) => (typeof value === 'string' ? value : undefined);

      if (host === 'debug' || path.startsWith('debug/')) {
        if (path.endsWith('success')) {
          console.log('[NIP155] navigating to debug success');
          router.push({
            pathname: '/debug/success',
            params: {
              id: toString(qp.id),
              code: toString(qp.code),
              reason: toString(qp.reason),
              event: toString(qp.event),
            },
          } as never);
          return;
        }
        if (path.endsWith('error')) {
          console.log('[NIP155] navigating to debug error');
          router.push({
            pathname: '/debug/error',
            params: {
              id: toString(qp.id),
              code: toString(qp.code),
              reason: toString(qp.reason),
            },
          } as never);
          return;
        }
      }

      if (isNip155Url(url)) {
        console.log('[NIP155] navigating to sign', path);
        const param = encodeURIComponent(url);
        router.replace({ pathname: '/sign', params: { u: param } } as never);
      }
    },
    [router]
  );

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const initial = await Linking.getInitialURL();
      if (!mounted) return;
      handleUrl(initial);
    })();

    const subscription = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    const unsubscribe = subscribeToCallbacks((url) => handleUrl(url));

    return () => {
      mounted = false;
      subscription.remove();
      unsubscribe();
    };
  }, [handleUrl]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}
