import { useEffect, useState } from 'react';
import { getPetById, type PetDefinition } from '../content/pets';
import { petMessage, resolvePetMood, type PetMood } from '../motion/pet';
import type { PetHomeDialogueTone } from '../motion/petHomeConversation';
import { FoxPet2D5D } from './FoxPet2D5D';

type PetProps = {
  mood: PetMood;
  reducedMotion: boolean;
  onTap: () => void;
  message?: string;
  messageTone?: PetHomeDialogueTone;
  size?: 'full' | 'compact';
  pet?: PetDefinition;
};

export function Pet({ mood, reducedMotion, onTap, message, messageTone, size = 'full', pet }: PetProps) {
  const activePet = pet ?? getPetById('fox-orange');
  const supports2D5D = activePet.id === 'fox-orange';
  const visualMood = resolvePetMood(mood, reducedMotion);
  const visualMessage = message ?? petMessage(visualMood);
  const [useFallback, setUseFallback] = useState(false);
  const [is2D5DReady, setIs2D5DReady] = useState(false);

  useEffect(() => {
    setUseFallback(false);
    setIs2D5DReady(false);
  }, [activePet.id]);

  const fallbackAlt = 'Cáo Nhỏ màu cam mặc khăn xanh, đeo ba lô và cầm la bàn';
  const imageSrc = useFallback ? '/art/fox-pet-alpha.png' : activePet.image.src;
  const imageAlt = useFallback ? fallbackAlt : activePet.image.alt;

  return (
    <div className={`pet-companion pet-size-${size} pet-mood-${visualMood}`}>
      <button className={`pet-avatar${supports2D5D && !useFallback ? ' pet-avatar-2d5d' : ''}${supports2D5D && is2D5DReady ? ' pet-avatar-2d5d-ready' : ''}`} type="button" onClick={onTap} aria-label={`Chạm vào ${activePet.name}`}>
        {!useFallback && supports2D5D && (
          <span className="fox-pet-2d5d-stage" aria-hidden="true">
            <FoxPet2D5D mood={visualMood} reducedMotion={reducedMotion} onReady={() => setIs2D5DReady(true)} onError={() => { setIs2D5DReady(false); setUseFallback(true); }} />
          </span>
        )}
        {(!supports2D5D || !is2D5DReady || useFallback) && <img className="pet-image" src={imageSrc} alt={imageAlt} onError={() => { setIs2D5DReady(false); setUseFallback(true); }} />}
      </button>
      <div className={`pet-bubble pet-bubble-speech${size === 'full' ? ' pet-bubble-full' : ''}${messageTone ? ` pet-bubble-tone-${messageTone}` : ''}`} key={visualMessage} role="status" aria-live="polite">
        {visualMessage}
      </div>
    </div>
  );
}
