import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';
import { MVP_LESSON_PACKAGES } from './src/content/packages';
import { createServiceWorkerSource } from './src/pwa/offline';

const LOCAL_ART_URLS = ['/art/world-background.png', '/art/world-background-portrait.png', '/art/fox-pet-alpha.png', '/art/brand-plaque-4a14.png',
  ...['journey', 'lessons', 'reward', 'pet', 'collection'].map((id) => `/art/dock/${id}.png`),
  ...['sound', 'settings', 'parent', 'leaderboard', 'challenge', 'friends', 'profile', 'logout'].map((id) => `/art/hud/${id}.png`),
  ...['passport-cover-lettered', 'start-journey'].map((id) => `/art/reward/${id}.png`),
  ...Array.from({ length: 29 }, (_, index) => `/art/stamps/stamp-${String(index + 1).padStart(2, '0')}.png`),
  ...['voi-nui-xanh', 'cu-tim-tham-hiem', 'rong-ngoc'].map((id) => `/art/pets/${id}.png`),
  '/art/progress/vietnam-progress-map-illustrated.png',
  '/art/collection/collection-emblem.png',
  '/art/lessons/lesson-01.png',
  '/art/lessons/lesson-02.png',
  '/art/lessons/lesson-03.png',
  '/art/lessons/lesson-04.png',
  '/art/lessons/lesson-05.png',
  '/art/lessons/lesson-06.png',
  '/art/lessons/lesson-07.png',
  '/art/lessons/lesson-08.png',
  '/art/lessons/lesson-09.png',
  '/art/lessons/lesson-10.png',
  '/art/lessons/lesson-11.png',
  '/art/lessons/lesson-12.png',
  '/art/lessons/lesson-13.png',
  '/art/lessons/lesson-14.png',
  '/art/lessons/lesson-15.png',
  '/art/lessons/lesson-16.png',
  '/art/lessons/lesson-17.png',
  '/art/lessons/lesson-18.png',
  '/art/lessons/lesson-19.png',
  '/art/lessons/lesson-20.png',
  '/art/lessons/lesson-21.png',
  '/art/lessons/lesson-22.png',
  '/art/lessons/lesson-23.png',
  '/art/lessons/lesson-24.png',
  '/art/lessons/lesson-25.png',
  '/art/lessons/lesson-26.png',
  '/art/lessons/lesson-27.png',
  '/art/lessons/lesson-28.png',
  '/art/lessons/lesson-29.png',
];
const LOCAL_PWA_URLS = [
  '/manifest.webmanifest',
  '/icons/favicon-32.png',
  '/icons/icon-180.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-512-maskable.png',
];
const LOCAL_PWA_VERSIONS = [
  '/manifest.webmanifest:a5712491f1aca4050f8519063cc1464ce37ccd249112b99a3d0cafb2f7a614e1',
  '/icons/favicon-32.png:24d5d7a562d2e64796b19872ca02454869a93b640635c38a4162a9c2cf849ed1',
  '/icons/icon-180.png:d9bde06f336bec768bec0f4348613f59a45908e4559595b6425f59701e2d4ee7',
  '/icons/icon-192.png:3596603c7ae97fb23eb67a30541f87dc10b36be9e8504d3444823349f675cd57',
  '/icons/icon-512.png:100b5697f8503055e26532686ad057b986e7da16dc8336a8a24efef2dc81fbe0',
  '/icons/icon-512-maskable.png:100b5697f8503055e26532686ad057b986e7da16dc8336a8a24efef2dc81fbe0',
];
const LOCAL_ART_VERSIONS = [
  '/art/world-background.png:9140df7a3cdbef4be19101945322261a59a64797d495f77e96c47d74d805e1bf',
  '/art/world-background-portrait.png:5976509d010b93cc4978894573e289d9d479b51ddf8c1acd06555e29f23c6039',
  '/art/fox-pet-alpha.png:0141b479768c575217bd3da5acde7aab7785356071cf6129ddd10713ac3bd8e3',
  '/art/brand-plaque-4a14.png:602f1761fdaf3effcf5f3fed0573cfacca959896d0d60b4ff32fdb6dfa2f01b1',
  '/art/progress/vietnam-progress-map-illustrated.png:93bb877ea95e3cf02d8070f1b978f4772b471e430de3b1fb64a3e6e95eb785ba',
  '/art/hud/leaderboard.png:4f7dd6dbd60ad388cbe03928f6f1b1b6bb94ed618872a78c57f4a61bf2b70390',
  '/art/hud/challenge.png:ea18d3350c5151f0aed716928d01cd181c1ce279819ceaf0a85625a3f5017748',
  '/art/hud/friends.png:e99ebefab63c949ce81c436862d58bef42d128078c44f47cc043fdfeca60386d',
  '/art/hud/profile.png:fce670d3596468db58a5088967bcb4252600fe66fe701244078566f235d35d9f',
  '/art/hud/logout.png:5b6cdef995d8b0570abdda09e8af8c3e74929e1c686817dd36441173f9dc3f6b',
  '/art/reward/passport-cover-lettered.png:0d24397c1c5eabf5ead97e828ccacb94a82a7b63be9284078545ae60b3faa3e6',
  '/art/reward/start-journey.png:2f19f8dd9d89b0778a21404bdd9b0e6eb724c64fbce358a2a6c66b7f12b000dc',
  '/art/stamps/stamp-01.png:4c48df37264766585714bc6508fa2dd290794caa50ad988f5ef3b5804dd45afd',
  '/art/stamps/stamp-02.png:665b380c72e65915aab4053edb65b6923da9c243c76bd633ae92424101e036ae',
  '/art/stamps/stamp-03.png:d4d0fcbaca34838406cf6d00e8e9ff954093249d375fd5a1283e6fae4f7dce49',
  '/art/stamps/stamp-04.png:80c641a9931ea0e0ae218a5ea8899b9b6cae753c066c1fb463e01ff45331ff09',
  '/art/stamps/stamp-05.png:953bad213a392c55a1870716c65c95f1fa082b5dfda5a744e8bb7705d0a128dd',
  '/art/stamps/stamp-06.png:d9d942868648dba390326e5f55769bf87571d7a530df14d40ff2773ec12167b0',
  '/art/stamps/stamp-07.png:1ec4f519944cb92bab2c25da91d4a089bea1a2a8dc972585be41f2d0240528cc',
  '/art/stamps/stamp-08.png:0602c33db135033a9c7b50d7e43cdff681e5f8eb7cde9c1ee1436dfd4b695427',
  '/art/stamps/stamp-09.png:95622a30f05b08ac993ada9db2c09ded20680b7306345eea21d21be331b8ed25',
  '/art/stamps/stamp-10.png:824d2de6092844c83aee5581c1894b0c591d16721b08d74297c2b4f291859afe',
  '/art/stamps/stamp-11.png:276658a92a56f40785c6a7ff098fd6318a0e889fd2e09cc97e8ca985413294d9',
  '/art/stamps/stamp-12.png:5113ac0560c0c434254db28fcffcbafce3fd152702bacd8feab68d1a83dc66b6',
  '/art/stamps/stamp-13.png:29111ec26da52b1fe37aeda34859b07d893f08943f4602f741f209906ebc15c9',
  '/art/stamps/stamp-14.png:3e2b67471c47f5455774383f2a3fd717b91e91b86482456fdc82b3359dadded1',
  '/art/stamps/stamp-15.png:e5d60f9bd7f55d39929df4fe7d8e552bbd22e01808a87099b6c90eebc8b8b33e',
  '/art/stamps/stamp-16.png:8dc3151050bb2915a2ef336abbdfbfa7a045d9882adc13a4f0dcde02103086e2',
  '/art/stamps/stamp-17.png:e0444355f3dcf03aa1fbacec867ca2917ac9532c3a6dcaac45c66ecee29825df',
  '/art/stamps/stamp-18.png:f86538d268d37c0c714fac91f11bfe32b4f5b3d70a0990aaa0994beedc7333ef',
  '/art/stamps/stamp-19.png:3f65b5b51a565d9d5ef214fdc8272c3c609b61f1c473e01f3fb1d072751701d1',
  '/art/stamps/stamp-20.png:01d41eb482967f023685158c9d84fd8e49c283624095a4c5fd56e61c8ba1929f',
  '/art/stamps/stamp-21.png:59ae7d33b6a5800bff3f7bbdec8e46068b4e5b637744760990bb05ba7011eb99',
  '/art/stamps/stamp-22.png:6c6fcc4da4023f45939cbca0958a5476bb5cb2849003cb183b901195c5d719cf',
  '/art/stamps/stamp-23.png:3b5730d123d548a39b0bf4d8c1789a3673e2018b0620cc1d73ee4b33118a0690',
  '/art/stamps/stamp-24.png:f3f894504434dc0468a3decf54aeeb1b4d2686256dffde45ac711167e35348bd',
  '/art/stamps/stamp-25.png:d1ef45a25123394af4d62dd6d8237318b145ea37c7e4879559456af4b6e07f71',
  '/art/stamps/stamp-26.png:4456b67f5d81d099cb043c468c3977071386d53cc0bdb09d1cc9a9226344ddbc',
  '/art/stamps/stamp-27.png:7ee92694ae267a953aaa16c06209dcdc73741477ad21bc73f7a46ddad6546315',
  '/art/stamps/stamp-28.png:18743e5d5d22b734af9c649564fcbd5645aec6b74dab055de5447a08ba4eecf6',
  '/art/stamps/stamp-29.png:d4f0a013548daa7b5893392313216be24ab8899b5003ea86fca824c0131100b6',
  '/art/pets/voi-nui-xanh.png:98ca2cdd78d0a953f4d7d5944d96b1ec30d4439f1c65406ed0a622a2d595ac68',
  '/art/pets/cu-tim-tham-hiem.png:9ddfb0f3773b3d80098da181554e3a9779ae25afebde86e2aa02c6d2b29d75cd',
  '/art/pets/rong-ngoc.png:3fd122950b957b114569c0cf7129f2be209b51f24e22af0945b473955cef926b',
  '/art/collection/collection-emblem.png:9c2a818120bb7d8a8b1368cdc0d920a29ddcb5f1778cba0f531c1cbfb9a6bc97',
  '/art/lessons/lesson-01.png:c5ead47740d3b3089b94ea5c122bdd121ecd6a6be3f7b8077434182c60ba1160',
  '/art/lessons/lesson-02.png:07c7a9e0ec41f4172f6d2b16cb7c5edd74e702f082c766908c97cd3e45013a9e',
  '/art/lessons/lesson-03.png:1d1714c4d96194282b2da9dede7f6a8ea0fce20897b849fe59e22b6d5338222c',
  '/art/lessons/lesson-04.png:a24aaecddbe69a388c0906f13f91af3e4346bdc338cc7b4e4c98bddf9fecfadf',
  '/art/lessons/lesson-05.png:df21a744b043e85af19d1225ef5859100a250c2078767e5f4dfe98a26eef3075',
  '/art/lessons/lesson-06.png:4dfd4ef8bd3ed37e2fc2aee541683ced9b78ec7707e754b0e8752c8fb5aa20a0',
  '/art/lessons/lesson-07.png:400bd5911e5b85078957c94266487a45cb2d5d2309f2d230e0541f129807f7b0',
  '/art/lessons/lesson-08.png:f894d258b0e20d7523214d3ed472bb5423b620e6bd827ea6752992b238a0fe79',
  '/art/lessons/lesson-09.png:24bd8f72b9b95b6a0a390c0416e23ab0d2f4ebe73e41fd02e2b1af74b6fde823',
  '/art/lessons/lesson-10.png:34e4291b77df917074b726c57b112ae7615071ec3d70620330357bce90d64d4f',
  '/art/lessons/lesson-11.png:e34357e51223b621d906ca389a31580f0e86be1912d3b30eb63b501372b53787',
  '/art/lessons/lesson-12.png:d81688901e8fdeb84278840f221ad54feb173e399659fdfe83efb65ac0416b35',
  '/art/lessons/lesson-13.png:c8b4d74b7c05d64aa39e269037616a5ad6562cdc47caf42cf7cab66b35090cf5',
  '/art/lessons/lesson-14.png:b59fab377ec7feee157913fd8c54da8a4dd08fb3e307f6a173de33d7e64d6c3a',
  '/art/lessons/lesson-15.png:1cad4d4dea5cf4525f8e5276758349ba1e9293226fa357ccc29f91de026488cf',
  '/art/lessons/lesson-16.png:f3b0c61baa50a1f661c5d51f4285fab795431339f7c85948cc9fc5ee55a268ae',
  '/art/lessons/lesson-17.png:0293c4e1b27d549fd8d98fe4c491ac684876b0aaf2918cf4bc8ebc69cfe3d858',
  '/art/lessons/lesson-18.png:16c10e58007b4dc8377920a08f64e9b6cfc9609ff4b738a87b49b85308e067ee',
  '/art/lessons/lesson-19.png:0f05100b051857c5be737d1f38f6557dbac1f62aa2939bb630fbdb158a406e75',
  '/art/lessons/lesson-20.png:1ee3c45c39d40c1dc22cbc10b6abf647cf85c63ce0a04539abb7aa596c6ecd0a',
  '/art/lessons/lesson-21.png:5711033e3ac656ac67c6cc13033e87d5afc4f2cedd14575676a247452f32a839',
  '/art/lessons/lesson-22.png:97136fd6f2e2ca310395598c7837c3411ca8807425eae8afd5f2a1eca8ed174c',
  '/art/lessons/lesson-23.png:d878ceb53258229c7ea55f708267ff30c28e7d22d69b39675cd73e160f44319e',
  '/art/lessons/lesson-24.png:82d7021ea8d18d92260bcfe7406000aa999baa0fb1b63d12e1dcbfb9474b57d9',
  '/art/lessons/lesson-25.png:fe67750393ae491c41b1431ce16a3c6d47399fce415393e0af53d265a7f82f78',
  '/art/lessons/lesson-26.png:139a48da7eec70e226f6dd33e6db9896fb669231292c0b13c487c6bb87e5f98b',
  '/art/lessons/lesson-27.png:56736451c8105c133b1691aded7767db2b22518c9fc107787d2a08dd5fc0dc06',
  '/art/lessons/lesson-28.png:0d25ae63b7163321e836aa42090b2752f439f73d8133efd41ff04cd3e324f13d',
  '/art/lessons/lesson-29.png:0215ee3458200c5bcbf8d9040ebd4632f850d21be29895dc4bcbd58cbbaed76f',
];
const LOCAL_FONT_URLS = [
  '/fonts/BeVietnamPro-vietnamese-400.woff2',
  '/fonts/BeVietnamPro-latinext-400.woff2',
  '/fonts/BeVietnamPro-latin-400.woff2',
  '/fonts/BeVietnamPro-vietnamese-700.woff2',
  '/fonts/BeVietnamPro-latinext-700.woff2',
  '/fonts/BeVietnamPro-latin-700.woff2',
  '/fonts/BeVietnamPro-vietnamese-800.woff2',
  '/fonts/BeVietnamPro-latinext-800.woff2',
  '/fonts/BeVietnamPro-latin-800.woff2',
  '/fonts/BeVietnamPro-vietnamese-900.woff2',
  '/fonts/BeVietnamPro-latinext-900.woff2',
  '/fonts/BeVietnamPro-latin-900.woff2',
];
const LOCAL_FONT_VERSIONS = [
  '/fonts/BeVietnamPro-vietnamese-400.woff2:dc085e2fba3414e5c5bf1e6172f921a9f81c5859946a4ed3d63c1e470d96a9e2',
  '/fonts/BeVietnamPro-latinext-400.woff2:f7a2811e471c2973a1179ce39da3ad6bb8082381aa8d1535ccfcbc3d6d78a052',
  '/fonts/BeVietnamPro-latin-400.woff2:03d1b589cff172e1a670b3573e731d3380bc326f80cf83b0d3504e3188e2e074',
  '/fonts/BeVietnamPro-vietnamese-700.woff2:4f58af2d1c3e28a9ba14c51c82db2751d78344b75bdcb34de24a1031ebe59da6',
  '/fonts/BeVietnamPro-latinext-700.woff2:33d57e5bd840b03921568e08d2be1082d453e55f1ba55f421e41a1aa54e12601',
  '/fonts/BeVietnamPro-latin-700.woff2:a193dd87699bd2e18ddf72dc271493ea82a23dad9f5c334d9f2a257b1e05fc30',
  '/fonts/BeVietnamPro-vietnamese-800.woff2:26b241d1d5f489c8a65c1a3c4cdcdb48dd114a9ed7e0c0180182191f087cbe96',
  '/fonts/BeVietnamPro-latinext-800.woff2:85a2008e6d5f2381a076d36d38771957b118683d0fff3029844737aff6b96a10',
  '/fonts/BeVietnamPro-latin-800.woff2:7c5d0871188c09339a6eb46948420ed9b11f3d06ea3ff1c5d1cf41b06a3504e7',
  '/fonts/BeVietnamPro-vietnamese-900.woff2:70b8feb4c47c137c77ba65d3ef73d5eeda852af1d7ce26f307d7853983948795',
  '/fonts/BeVietnamPro-latinext-900.woff2:8734a69a892ce1efb37eeda024affe833d99f4cde8fce0c0bbfb4afa5255e6b0',
  '/fonts/BeVietnamPro-latin-900.woff2:b7437222bf15d6be4394c13ec31188e1bf8b9be13e6c38dc4c18ad14511b4888',
];

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function offlineServiceWorkerPlugin(): Plugin {
  return {
    name: 'hoc-vui-offline-worker',
    apply: 'build',
    generateBundle(_options, bundle) {
      const builtShellUrls = Object.keys(bundle)
        .filter((fileName) => /\.(?:js|css)$/.test(fileName))
        .sort()
        .map((fileName) => `/${fileName}`);
      const lessonUrls = MVP_LESSON_PACKAGES.map((lesson) => `/lessons/${lesson.id}.json`);
      const precacheUrls = ['/', '/index.html', '/offline-manifest.json', ...builtShellUrls, ...LOCAL_ART_URLS, ...LOCAL_PWA_URLS, ...LOCAL_FONT_URLS, ...lessonUrls];
      const builtFingerprint = Object.keys(bundle).sort().map((fileName) => {
        const item = bundle[fileName];
        const source = item.type === 'chunk'
          ? item.code
          : typeof item.source === 'string' ? item.source : new TextDecoder().decode(item.source);
        return `${fileName}:${source}`;
      }).join('|');
      const lessonFingerprint = MVP_LESSON_PACKAGES.map((lesson) => JSON.stringify(lesson)).join('|');
      const offlineCacheName = `hoc-vui-offline-${hashString(`${builtFingerprint}|${lessonFingerprint}|${LOCAL_ART_VERSIONS.join('|')}|${LOCAL_PWA_VERSIONS.join('|')}|${LOCAL_FONT_VERSIONS.join('|')}`)}`;

      for (const lesson of MVP_LESSON_PACKAGES) {
        this.emitFile({
          type: 'asset',
          fileName: `lessons/${lesson.id}.json`,
          source: JSON.stringify(lesson),
        });
      }

      this.emitFile({
        type: 'asset',
        fileName: 'sw.js',
        source: createServiceWorkerSource(offlineCacheName, precacheUrls),
      });

      this.emitFile({
        type: 'asset',
        fileName: 'offline-manifest.json',
        source: JSON.stringify({ schemaVersion: 1, cacheName: offlineCacheName, urls: precacheUrls }),
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), offlineServiceWorkerPlugin()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}', 'shared/**/*.test.ts', 'server/**/*.test.ts', 'supabase/**/*.test.ts', 'tests/e2e/**/*.spec.ts'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/._*', '**/**/._*'],
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
    strictPort: true,
  },
});
