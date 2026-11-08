import baseConfig from './app.json';

const variant = process.env.APP_VARIANT === 'lite' ? 'lite' : 'full';
const isLite = variant === 'lite';

export default ({ config = {} }) => ({
  ...baseConfig.expo,
  ...config,
  name: isLite ? 'Wanchat Lite' : 'Wanchat Yemen',
  slug: isLite ? 'wanchat-yemen-lite' : 'wanchat-yemen-app-lxa18bv1',
  android: {
    ...baseConfig.expo.android,
    ...config.android,
    package: isLite
      ? 'com.wanchatyemen.messenger.lite'
      : 'com.wanchatyemen.messenger',
  },
  extra: {
    ...baseConfig.expo.extra,
    ...config.extra,
    appVariant: variant,
  },
});
