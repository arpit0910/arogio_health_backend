import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { inArray, or, sql } from 'drizzle-orm';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import {
  meditationInput,
  youtubeVideoId,
} from '../../modules/meditation-library/requests/meditation-library.input';
import * as schema from '../schema';
import { meditationSessions } from './meditation-sessions';
import { wellnessVideos } from './wellness-videos';
import { yogaPostureGroups } from './yoga-postures';

const { meditationLibraryItems: items, wellnessPublicationVersions: versions } = schema;
const yogaPreparation: Record<keyof typeof yogaPostureGroups, string> = {
  chair:
    'Use a firm, stable chair on a level surface. Keep the movement small and stop if you feel pain or lose your balance.',
  standing:
    'Use a level, nonslip surface with a sturdy support within reach. Stay within a comfortable range and stop if you feel pain or lose your balance.',
  seated:
    'Use a nonslip mat and sit on a folded blanket if you need more support. Stay within a comfortable range and stop if you feel pain.',
  kneeling:
    'Put padding under your knees and work in a comfortable range. Skip the posture if your knees or wrists hurt.',
  floor:
    'Use a comfortable mat and set out cushions before starting. Change position or stop if you feel pain.',
  balance:
    'Ask a qualified yoga instructor to assess your balance and suggest a version appropriate for you.',
  instructor:
    'Review this posture with a qualified yoga instructor before you try it. Ask for a demonstration and an alternative that suits your experience.',
};

const yogaPreparationHi: Record<keyof typeof yogaPostureGroups, string> = {
  chair: 'एक मजबूत और स्थिर कुर्सी को समतल सतह पर रखें। गति को हल्का रखें और दर्द या संतुलन बिगड़ने पर रुक जाएं।',
  standing: 'समतल, न फिसलने वाली सतह पर अभ्यास करें और पास में मजबूत सहारा रखें। आरामदायक सीमा में रहें और दर्द होने पर रुक जाएं।',
  seated: 'न फिसलने वाले मैट का उपयोग करें और अतिरिक्त सहारे के लिए मुड़े हुए कंबल पर बैठें। दर्द महसूस होने पर रुक जाएं।',
  kneeling: 'घुटनों के नीचे गद्दी या तौलिया रखें और आरामदायक सीमा में अभ्यास करें। घुटनों या कलाइयों में दर्द हो तो आसन छोड़ दें।',
  floor: 'आरामदायक मैट का उपयोग करें और शुरू करने से पहले तकिये पास रखें। दर्द होने पर स्थिति बदलें या रुक जाएं।',
  balance: 'किसी योग्य योग प्रशिक्षक से अपने संतुलन का आकलन कराएं और अपने लिए उपयुक्त विकल्प चुनें।',
  instructor: 'अभ्यास से पहले योग्य योग प्रशिक्षक से इस आसन की जानकारी लें और अपने अनुभव के अनुसार सरल विकल्प पूछें।',
};

const yogaImpact: Record<keyof typeof yogaPostureGroups, { en: string; hi: string }> = {
  chair: {
    en: 'Gently mobilizes the spine, shoulders, and hips while keeping joints supported with minimal balance strain.',
    hi: 'जोड़ों को सहारा देते हुए रीढ़, कंधों और कूल्हों में हल्का लचीलापन लाता है और संतुलन का दबाव कम रखता है।',
  },
  standing: {
    en: 'Builds leg strength, upright posture, ankle stability, and mindful body alignment.',
    hi: 'पैरों की ताकत, सीधी मुद्रा, टखनों की स्थिरता और शरीर के संतुलित संरेखण को बेहतर बनाता है।',
  },
  seated: {
    en: 'Releases tension in the hips, lower back, and hamstrings while encouraging calm, steady breathing.',
    hi: 'कूल्हों, कमर के निचले हिस्से और हैमस्ट्रिंग के तनाव को कम करता है तथा शांत और स्थिर श्वास में मदद करता है।',
  },
  kneeling: {
    en: 'Improves spinal mobility, gentle core engagement, and shoulder flexibility.',
    hi: 'रीढ़ की गतिशीलता, कोर की हल्की मजबूती और कंधों के लचीलेपन में सुधार करता है।',
  },
  floor: {
    en: 'Supports deep relaxation, gentle back release, and nervous system recovery.',
    hi: 'गहरे विश्राम, पीठ के हल्के खिंचाव और तंत्रिका तंत्र को शांत करने में सहायक है।',
  },
  balance: {
    en: 'Enhances neuromuscular coordination, focus, and lower-body stability when practiced safely.',
    hi: 'सुरक्षित अभ्यास करने पर शारीरिक समन्वय, एकाग्रता और निचले शरीर की स्थिरता को बढ़ाता है।',
  },
  instructor: {
    en: 'Targets deeper strength, flexibility, and breath control under qualified supervision.',
    hi: 'योग्य मार्गदर्शन में गहरी शक्ति, लचीलेपन और श्वास नियंत्रण को विकसित करता है।',
  },
};

const postureVideoMap: Record<string, string> = {
  'chair mountain': 'https://www.youtube.com/watch?v=-Ts01MC2mIo',
  'mountain pose': 'https://www.youtube.com/watch?v=NYhH8Gr35cI',
  'tree pose': 'https://www.youtube.com/watch?v=yVE4XXFFO70',
  'cat': 'https://www.youtube.com/watch?v=y39PrKY_4JM',
  'cow': 'https://www.youtube.com/watch?v=y39PrKY_4JM',
  "extended child's pose": 'https://www.youtube.com/watch?v=eqVMAPM00DM',
  'triangle pose': 'https://www.youtube.com/watch?v=upFYlxZHif0',
  'downward-facing dog': 'https://www.youtube.com/watch?v=j97SSGsnCAQ',
  'warrior i': 'https://www.youtube.com/watch?v=5rT--p_cLOc',
  'warrior ii': 'https://www.youtube.com/watch?v=4Ejz7IgODlU',
  'cobra pose': 'https://www.youtube.com/watch?v=n6jrC6WeF84',
  'bridge pose': 'https://www.youtube.com/watch?v=NnbvPeAIhmA',
  'reclined twist': 'https://www.youtube.com/watch?v=mKC3IeldPOc',
};

function findPostureVideo(name: string): string {
  const key = name.toLowerCase();
  for (const [pattern, url] of Object.entries(postureVideoMap)) {
    if (key.includes(pattern)) return url;
  }
  return '';
}

function findPostureVideoId(name: string): string | null {
  const url = findPostureVideo(name);
  return url ? youtubeVideoId(url) : null;
}

function seedId(section: string, key: string) {
  // A stable UUID allows concurrent runs to insert each entry at most once.
  const bytes = createHash('sha256')
    .update(`arogio:wellness-starter:${section}:${key}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x80;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  return bytes.toString('hex').replace(/^(........)(....)(....)(....)/, '$1-$2-$3-$4-');
}

function prepareRecord(section: 'meditation' | 'yoga', title: string, data: unknown) {
  const practice = meditationInput.parse(data);
  const videoId = practice.youtubeUrl ? youtubeVideoId(practice.youtubeUrl) : null;
  return {
    id: practice.kind === 'video' && videoId ? seedId('video', videoId) : seedId(section, title.toLowerCase()),
    kind: practice.kind,
    section,
    title_en: practice.title_en,
    title_hi: practice.title_hi,
    description_en: practice.description_en,
    description_hi: practice.description_hi,
    preparation_en: practice.preparation_en,
    preparation_hi: practice.preparation_hi,
    impact_en: practice.impact_en,
    impact_hi: practice.impact_hi,
    sanskritName: practice.sanskritName,
    difficulty: practice.difficulty,
    imageUrl: practice.imageUrl,
    audioUrl: practice.audioUrl,
    steps: practice.steps,
    author: practice.author,
    videoId,
    published: practice.published,
    sortOrder: practice.sortOrder,
    durationSeconds:
      practice.kind === 'video'
        ? practice.durationSeconds
        : practice.steps.reduce((total, step) => total + step.seconds, 0) * practice.repeat,
  };
}

export function prepareWellnessSeed() {
  const meditation = meditationSessions.map(({ title, description, steps }, index) =>
    prepareRecord('meditation', title, {
      kind: 'practice',
      section: 'meditation',
      title_en: title,
      title_hi: title,
      description_en: description,
      description_hi: 'शांत होकर अपनी श्वास और वर्तमान क्षण पर ध्यान केंद्रित करने का निर्देशित अभ्यास।',
      preparation_en:
        'Find a comfortable place to pause. You can keep your eyes open and stop whenever you like.',
      preparation_hi:
        'रुकने के लिए एक आरामदायक स्थान चुनें। आप आंखें खुली रख सकते हैं और जब चाहें रुक सकते हैं।',
      impact_en: 'Calms racing thoughts, lowers mental fatigue, and supports steady, relaxed breathing.',
      impact_hi: 'तेज विचारों को शांत करता है, मानसिक थकान कम करता है और सहज श्वास में मदद करता है।',
      difficulty: 'gentle',
      imageUrl: 'posture:meditation',
      steps: steps.map(([title_en, instruction_en, seconds]) => ({
        title_en,
        title_hi: title_en,
        instruction_en,
        instruction_hi: instruction_en,
        seconds,
      })),
      sortOrder: 1000 + index,
    }),
  );
  let sortOrder = 2000;
  const yoga = (Object.keys(yogaPostureGroups) as (keyof typeof yogaPostureGroups)[]).flatMap(
    (group) =>
      yogaPostureGroups[group].map(([name, sanskrit, cue, paired]) => {
        const instructorLed = group === 'instructor' || group === 'balance';
        const description = [
          sanskrit && `${sanskrit}.`,
          instructorLed ? 'Instructor-guided posture preview.' : '',
          cue,
        ]
          .filter(Boolean)
          .join(' ');
        const descriptionHi = [
          sanskrit ? `${sanskrit}।` : '',
          instructorLed ? 'प्रशिक्षक-निर्देशित आसन पूर्वावलोकन।' : '',
          `अभ्यास निर्देश: ${cue}`,
        ]
          .filter(Boolean)
          .join(' ');
        const postureVideoId = findPostureVideoId(name);
        return prepareRecord('yoga', name, {
          kind: 'practice',
          section: 'yoga',
          title_en: name,
          title_hi: sanskrit ? `${name} (${sanskrit})` : name,
          sanskritName: sanskrit,
          difficulty: instructorLed ? 'intermediate' : group === 'chair' ? 'gentle' : 'beginner',
          imageUrl: `posture:${group}`,
          description_en: description,
          description_hi: descriptionHi,
          preparation_en: yogaPreparation[group],
          preparation_hi: yogaPreparationHi[group],
          impact_en: yogaImpact[group].en,
          impact_hi: yogaImpact[group].hi,
          steps: instructorLed
            ? [
                {
                  title_en: 'Review the posture',
                  title_hi: 'आसन की समीक्षा करें',
                  instruction_en: description,
                  instruction_hi: descriptionHi,
                  seconds: 15,
                  sanskritName: sanskrit,
                  imageUrl: `posture:${group}`,
                  impact_en: yogaImpact[group].en,
                  impact_hi: yogaImpact[group].hi,
                  videoId: postureVideoId,
                  phase: 'main',
                },
                {
                  title_en: 'Plan with your instructor',
                  title_hi: 'प्रशिक्षक के साथ योजना बनाएं',
                  instruction_en:
                    'Ask about the setup, an appropriate modification, and how to come out of the posture. Use this preview as a reference.',
                  instruction_hi:
                    'सही शुरुआत, सरल विकल्प और आसन से बाहर आने के तरीके के बारे में प्रशिक्षक से पूछें।',
                  seconds: 15,
                  phase: 'cooldown',
                },
              ]
            : [
                {
                  title_en: 'Get ready',
                  title_hi: 'तैयार हो जाएं',
                  instruction_en: yogaPreparation[group],
                  instruction_hi: yogaPreparationHi[group],
                  seconds: 15,
                  phase: 'warmup',
                },
                {
                  title_en: paired ? 'Try the first side' : 'Try the posture',
                  title_hi: paired ? 'पहली तरफ से अभ्यास करें' : 'आसन का अभ्यास करें',
                  instruction_en: cue,
                  instruction_hi: `${cue} (आरामदायक श्वास के साथ स्थिर रहें।)`,
                  seconds: 15,
                  sanskritName: sanskrit,
                  imageUrl: `posture:${group}`,
                  impact_en: yogaImpact[group].en,
                  impact_hi: yogaImpact[group].hi,
                  videoId: postureVideoId,
                  phase: 'main',
                },
                ...(paired
                  ? [
                      {
                        title_en: 'Try the other side',
                        title_hi: 'दूसरी तरफ से अभ्यास करें',
                        instruction_en: `Return to your starting position first. Repeat on the other side. ${cue}`,
                        instruction_hi: `पहले प्रारंभिक स्थिति में लौटें और दूसरी तरफ दोहराएं। ${cue}`,
                        seconds: 15,
                        sanskritName: sanskrit,
                        imageUrl: `posture:${group}`,
                        phase: 'main' as const,
                      },
                    ]
                  : []),
                {
                  title_en: 'Return to rest',
                  title_hi: 'विश्राम की स्थिति में लौटें',
                  instruction_en: 'Move out of the posture slowly and take a comfortable pause.',
                  instruction_hi: 'धीरे-धीरे आसन से बाहर आएं और आराम से विश्राम करें।',
                  seconds: 10,
                  phase: 'cooldown',
                },
              ],
          sortOrder: sortOrder++,
        });
      }),
  );
  const videos = (['yoga', 'meditation'] as const).flatMap((section) =>
    wellnessVideos[section].map(
      ({ video: [id, title, description, durationSeconds], author, titleHi }, index) =>
        prepareRecord(section, title, {
          kind: 'video',
          section,
          title_en: title,
          title_hi: titleHi,
          description_en: description,
          author,
          youtubeUrl: `https://www.youtube.com/watch?v=${id}`,
          durationSeconds,
          sortOrder: (section === 'yoga' ? 1900 : 1050) + index,
        }),
    ),
  );
  const catalog = [...meditation, ...yoga, ...videos];
  if (new Set(catalog.map(({ id }) => id)).size !== catalog.length)
    throw new Error('Wellness seed contains duplicate entries.');
  return catalog;
}

function titleKey(kind: string, section: string, title: string) {
  return `${kind}:${section}:${title.trim().toLowerCase()}`;
}

export function prepareStructuredSessions() {
  return [
    prepareRecord('yoga', 'Morning Gentle Mobility Flow', {
      kind: 'practice',
      section: 'yoga',
      title_en: 'Morning Gentle Mobility Flow',
      title_hi: 'प्रातःकालीन सहज योग प्रवाह',
      sanskritName: 'Tadasana · Marjaryasana · Balasana',
      difficulty: 'beginner',
      imageUrl: 'posture:standing',
      youtubeUrl: 'https://www.youtube.com/watch?v=NYhH8Gr35cI',
      description_en: 'A complete 3-phase yoga session: gentle warm-up, standing & spinal postures, and restful cool-down.',
      description_hi: 'तीन चरणों वाला पूर्ण योग सत्र: हल्का वार्म-अप, खड़े और रीढ़ के आसन, तथा विश्राम।',
      preparation_en: 'Use a nonslip mat with water nearby. Move at your own comfortable pace.',
      preparation_hi: 'न फिसलने वाले मैट का उपयोग करें और अपनी आरामदायक गति से अभ्यास करें।',
      impact_en: 'Wakes up stiff joints, lengthens the spine, improves posture, and boosts morning circulation.',
      impact_hi: 'जकड़े हुए जोड़ों को खोलता है, रीढ़ को लचीला बनाता है और सुबह के रक्त संचार को बढ़ाता है।',
      sortOrder: 900,
      steps: [
        {
          title_en: 'Warm-up: Centering Breath',
          title_hi: 'वार्म-अप: शांत श्वास',
          instruction_en: 'Stand or sit tall with relaxed shoulders. Take slow, natural breaths.',
          instruction_hi: 'कंधों को ढीला रखकर सीधे खड़े हों या बैठें। धीमी और सहज श्वास लें।',
          seconds: 45,
          phase: 'warmup',
          imageUrl: 'posture:standing',
        },
        {
          title_en: 'Mountain Pose',
          title_hi: 'ताड़ासन (Mountain Pose)',
          sanskritName: 'Tadasana',
          instruction_en: 'Stand with feet hip-width apart, lengthen through the crown of your head, and ground both feet.',
          instruction_hi: 'पैरों को कूल्हों की चौड़ाई पर रखें, रीढ़ को सीधा करें और दोनों पैरों पर संतुलन बनाएं।',
          impact_en: 'Improves upright alignment, balance, and leg stability.',
          impact_hi: 'सीधी मुद्रा, संतुलन और पैरों की स्थिरता को बेहतर बनाता है।',
          videoId: 'NYhH8Gr35cI',
          imageUrl: 'posture:standing',
          seconds: 60,
          phase: 'main',
        },
        {
          title_en: 'Cat–Cow Stretch',
          title_hi: 'मार्जरी-बितिलासन (Cat–Cow)',
          sanskritName: 'Marjaryasana–Bitilasana',
          instruction_en: 'On hands and knees (or seated with hands on thighs), gently arch and round your back with your breath.',
          instruction_hi: 'श्वास के साथ पीठ को धीरे-धीरे ऊपर मोड़ें और नीचे झुकाएं।',
          impact_en: 'Relieves lower-back stiffness and warms up the entire spine.',
          impact_hi: 'कमर के निचले हिस्से की जकड़न कम करता है और रीढ़ को लचीला बनाता है।',
          videoId: 'y39PrKY_4JM',
          imageUrl: 'posture:kneeling',
          seconds: 90,
          phase: 'main',
        },
        {
          title_en: "Cool-down: Extended Child's Pose",
          title_hi: 'विश्राम: बालासन (Child’s Pose)',
          sanskritName: 'Utthita Balasana',
          instruction_en: 'Rest hips back toward your heels, reach arms gently forward, and soften your jaw.',
          instruction_hi: 'कूल्हों को एड़ियों की ओर ले जाएं, बाहों को आगे फैलाएं और शरीर को ढीला छोड़ें।',
          impact_en: 'Gently stretches hips and shoulders while calming the nervous system.',
          impact_hi: 'कूल्हों और कंधों को हल्का खिंचाव देता है तथा मन को शांत करता है।',
          videoId: 'eqVMAPM00DM',
          imageUrl: 'posture:floor',
          seconds: 60,
          phase: 'cooldown',
        },
      ],
    }),
    prepareRecord('yoga', 'Desk & Chair Posture Relief', {
      kind: 'practice',
      section: 'yoga',
      title_en: 'Desk & Chair Posture Relief',
      title_hi: 'कुर्सी और डेस्क योग सत्र',
      sanskritName: 'Chair Tadasana · Bharadvajasana',
      difficulty: 'gentle',
      imageUrl: 'posture:chair',
      youtubeUrl: 'https://www.youtube.com/watch?v=-Ts01MC2mIo',
      description_en: 'A gentle seated yoga session for neck, shoulder, and lower-back relief right from a sturdy chair.',
      description_hi: 'मजबूत कुर्सी पर बैठकर गर्दन, कंधों और कमर के तनाव को कम करने का सहज योग सत्र।',
      preparation_en: 'Sit on a stable, armless or firm chair with both feet flat on the floor.',
      preparation_hi: 'एक स्थिर कुर्सी पर दोनों पैर जमीन पर टिकाकर बैठें।',
      impact_en: 'Eases desk-related neck and shoulder tension and improves seated spinal mobility.',
      impact_hi: 'लंबे समय तक बैठने से होने वाले गर्दन व कंधों के दर्द को कम करता है।',
      sortOrder: 901,
      steps: [
        {
          title_en: 'Warm-up: Chair Mountain',
          title_hi: 'वार्म-अप: कुर्सी ताड़ासन',
          sanskritName: 'Chair Tadasana',
          instruction_en: 'Plant both feet firmly, lengthen your spine, and roll shoulders back gently.',
          instruction_hi: 'दोनों पैर जमीन पर टिकाएं, रीढ़ सीधी रखें और कंधों को धीरे से पीछे घुमाएं।',
          imageUrl: 'posture:chair',
          seconds: 45,
          phase: 'warmup',
        },
        {
          title_en: 'Chair Seated Twist',
          title_hi: 'कुर्सी पर बैठा हुआ ट्विस्ट',
          sanskritName: 'Bharadvajasana',
          instruction_en: 'Turn your chest gently to the right for 30s, then to the left for 30s without forcing.',
          instruction_hi: 'बिना जोर लगाए छाती को धीरे-धीरे पहले दाईं ओर और फिर बाईं ओर मोड़ें।',
          impact_en: 'Releases mid-back stiffness and aids gentle abdominal circulation.',
          impact_hi: 'पीठ के मध्य भाग की जकड़न को कम करता है।',
          videoId: '-Ts01MC2mIo',
          imageUrl: 'posture:chair',
          seconds: 60,
          phase: 'main',
        },
        {
          title_en: 'Cool-down: Rest & Breath',
          title_hi: 'विश्राम: सहज श्वास',
          instruction_en: 'Rest hands on thighs, soften your gaze, and take 4 slow breaths.',
          instruction_hi: 'हाथों को जांघों पर रखें, आंखें कोमल रखें और 4 धीमी सांसें लें।',
          imageUrl: 'posture:chair',
          seconds: 45,
          phase: 'cooldown',
        },
      ],
    }),
    prepareRecord('meditation', 'Evening Calm & Body Scan', {
      kind: 'practice',
      section: 'meditation',
      title_en: 'Evening Calm & Body Scan',
      title_hi: 'संध्या शांति और बॉडी स्कैन ध्यान',
      difficulty: 'gentle',
      imageUrl: 'posture:meditation',
      youtubeUrl: 'https://www.youtube.com/watch?v=3X-_qx9Txto',
      description_en: 'A structured 3-stage meditation session to release the day and settle into restful stillness.',
      description_hi: 'दिन भर की थकान छोड़कर शांत विश्राम में जाने के लिए तीन चरणों का ध्यान सत्र।',
      preparation_en: 'Sit or lie down comfortably. Keep eyes closed or softly lowered.',
      preparation_hi: 'आराम से बैठें या लेट जाएं। आंखें बंद रखें या नीचे की ओर हल्की दृष्टि रखें।',
      impact_en: 'Lowers evening stress, eases muscle tension, and prepares the mind for restful sleep.',
      impact_hi: 'शाम के तनाव को कम करता है, मांसपेशियों को शिथिल करता है और अच्छी नींद में मदद करता है।',
      sortOrder: 902,
      steps: [
        {
          title_en: 'Settle & Ground',
          title_hi: 'स्थिर हों और आधार महसूस करें',
          instruction_en: 'Notice the weight of your body supported by the chair or mat.',
          instruction_hi: 'कुर्सी या मैट द्वारा अपने शरीर को मिलने वाले सहारे को महसूस करें।',
          seconds: 45,
          phase: 'warmup',
        },
        {
          title_en: 'Head-to-Toe Body Scan',
          title_hi: 'सिर से पैर तक बॉडी स्कैन',
          instruction_en: 'Slowly bring gentle awareness from your forehead and jaw down to your shoulders, hands, and feet.',
          instruction_hi: 'धीरे-धीरे अपना ध्यान माथे, जबड़े, कंधों, हाथों और पैरों की ओर ले जाएं।',
          videoId: '3X-_qx9Txto',
          seconds: 150,
          phase: 'main',
        },
        {
          title_en: 'Quiet Return',
          title_hi: 'शांत वापसी',
          instruction_en: 'Widen your awareness to the room around you and move gently when ready.',
          instruction_hi: 'अपने आसपास के वातावरण को महसूस करें और तैयार होने पर धीरे से आंखें खोलें।',
          seconds: 45,
          phase: 'cooldown',
        },
      ],
    }),
  ];
}

export async function seedWellness<
  TQuery extends PgQueryResultHKT,
  TSchema extends Record<string, unknown>,
>(db: PgDatabase<TQuery, TSchema>, options: { includeSessions?: boolean; publish?: boolean } = {}) {
  const catalog = options.includeSessions
    ? [...prepareWellnessSeed(), ...prepareStructuredSessions()]
    : prepareWellnessSeed();
  const ids = catalog.map(({ id }) => id);
  const titles = catalog.map(({ title_en }) => title_en.toLowerCase());
  const videoIds = catalog.flatMap(({ videoId }) => (videoId ? [videoId] : []));
  return db.transaction(async (tx) => {
    const existing = await tx
      .select({
        id: items.id,
        kind: items.kind,
        section: items.section,
        title: items.title_en,
        videoId: items.videoId,
      })
      .from(items)
      .where(
        or(
          inArray(items.id, ids),
          inArray(sql`lower(trim(${items.title_en}))`, titles),
          inArray(items.videoId, videoIds),
        ),
      );
    const history = await tx
      .selectDistinct({ id: versions.itemId })
      .from(versions)
      .where(inArray(versions.itemId, ids));
    const knownIds = new Set([...existing, ...history].map(({ id }) => id));
    const knownTitles = new Set(
      existing.map(({ kind, section, title }) => titleKey(kind, section, title)),
    );
    const knownVideos = new Set(existing.filter(({ kind }) => kind === 'video').map(({ videoId }) => videoId));
    const inserts = catalog.filter(
      ({ id, kind, section, title_en, videoId }) =>
        !knownIds.has(id) &&
        !knownTitles.has(titleKey(kind, section, title_en)) &&
        (kind !== 'video' || !videoId || !knownVideos.has(videoId)),
    );
    if (!inserts.length) return { inserted: 0, skipped: catalog.length };

    const updatedAt = new Date();
    const inserted = await tx
      .insert(items)
      .values(
        inserts.map((item) => ({
          ...item,
          published: options.publish ? true : item.published,
          publishedVersion: options.publish ? 1 : 0,
          updatedAt,
        })),
      )
      .onConflictDoNothing({ target: items.id })
      .returning({ id: items.id });
    return { inserted: inserted.length, skipped: catalog.length - inserted.length };
  });
}

async function main() {
  const options = new Set(process.argv.slice(2));
  const includeSessions = options.has('--sessions');
  const publish = options.has('--publish');
  const mode = options.has('--local') ? '--local' : options.has('--apply') ? '--apply' : null;
  if (!mode) {
    const catalog = prepareWellnessSeed();
    const sessions = prepareStructuredSessions();
    const yoga = catalog.filter(
      ({ kind, section }) => kind === 'practice' && section === 'yoga',
    ).length;
    const meditation = catalog.filter(
      ({ kind, section }) => kind === 'practice' && section === 'meditation',
    ).length;
    const videos = catalog.length - yoga - meditation;
    console.log(
      `Validated ${yoga} yoga postures, ${meditation} meditation sessions, ${videos} videos, and ${sessions.length} structured sessions. Use --apply or --local (with optional --sessions --publish).`,
    );
    return;
  }
  const { inserted, skipped } =
    mode === '--local'
      ? await seedEmbeddedDatabase({ includeSessions, publish })
      : await seedPostgres({ includeSessions, publish });
  console.log(`Inserted ${inserted} wellness ${publish ? 'published items' : 'drafts'}. Skipped ${skipped} existing entries.`);
}

async function seedPostgres(options: { includeSessions?: boolean; publish?: boolean } = {}) {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required with --apply.');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    connectionTimeoutMillis: 10_000,
  });
  try {
    return await seedWellness(drizzle({ client: pool, schema }), options);
  } catch {
    throw new Error(
      'Could not insert wellness drafts. Check the database connection and applied migrations.',
    );
  } finally {
    await pool.end();
  }
}

async function seedEmbeddedDatabase(options: { includeSessions?: boolean; publish?: boolean } = {}) {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle: drizzleLocal } = await import('drizzle-orm/pglite');
  // Reuse the embedded migration runner used by the local API.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { migrateLocal } = require('../../../scripts/database/migrate-local.cjs') as {
    migrateLocal: (db: InstanceType<typeof PGlite>, folder: string) => Promise<void>;
  };
  const database = new PGlite(resolve('.local/database'));
  try {
    await migrateLocal(database, resolve('database/migrations'));
    return await seedWellness(drizzleLocal(database, { schema }), options);
  } finally {
    await database.close();
  }
}

if (require.main === module)
  void main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : 'Wellness seed failed.');
    process.exitCode = 1;
  });
