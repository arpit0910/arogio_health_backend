const topics: Record<string, string> = {
  'Food & Nutrition': 'nutrition',
  'Yoga & Breathing': 'yoga',
  'Mental Wellbeing': 'mindfulness',
  'Exercise & Movement': 'movement',
  'Sleep & Rest': 'sleep',
  'Family & Children': 'family',
  'Healthy Aging': 'walking',
  'Remedies & Supplements': 'care',
  'Heart & Blood Pressure': 'care',
  'Common Health Conditions': 'care',
  'Prevention & Checkups': 'care',
  'First Aid & Safety': 'care',
  "Women's Health": 'walking',
  "Men's Health": 'movement',
  'Sexual Wellness (Adults)': 'family',
  'Skin & Oral Care': 'care',
};
export function topicImage(name: string) {
  return `/admin-assets/article-thumbnails/${topics[name] ?? 'wellbeing'}.jpg`;
}
