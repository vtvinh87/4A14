export type PetMood = 'idle' | 'greet' | 'think' | 'celebrate' | 'rest';

export function resolvePetMood(mood: PetMood, reducedMotion: boolean): PetMood {
  return reducedMotion && mood !== 'rest' ? 'rest' : mood;
}

export function petMessage(mood: PetMood): string {
  const messages: Record<PetMood, string> = {
    idle: 'Tớ ở đây nè. Cậu muốn khám phá gì trước?',
    greet: 'A, cậu chạm tớ này! Tớ vui quá!',
    think: 'Tớ đang nghĩ cùng cậu… cho tớ một nhịp nhé!',
    celebrate: 'Yay! Cậu làm được rồi!',
    rest: 'Tớ ngồi yên một chút để cậu tập trung nhé.',
  };
  return messages[mood];
}
