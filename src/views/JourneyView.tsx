import { useCallback, useRef, useState } from 'react';
import type { PetMood } from '../motion/pet';
import { pickPetHomeDialogue } from '../motion/petHomeConversation';
import { ArrowIcon } from '../components/icons';
import { Pet } from '../components/Pet';
import { JourneyFeatureRail } from '../components/JourneyFeatureRail';
import { DEFAULT_PET_ID } from '../content/pets';

type JourneyViewProps = {
  petMood: PetMood;
  reducedMotion: boolean;
  onPetTap: () => void;
  onOpenLessons: () => void;
  onOpenFriends?: () => void;
  friendsUnreadCount?: number;
  onOpenChallenge?: () => void;
  onOpenProgress?: () => void;
  progressBoardEnabled?: boolean;
};

export function JourneyView({ petMood, reducedMotion, onPetTap, onOpenLessons, onOpenFriends, friendsUnreadCount, onOpenChallenge, onOpenProgress, progressBoardEnabled }: JourneyViewProps) {
  const [homeDialogue, setHomeDialogue] = useState(() => pickPetHomeDialogue(DEFAULT_PET_ID));
  const homeDialogueIndexRef = useRef(homeDialogue.index);
  const chooseHomeDialogue = useCallback(() => {
    const next = pickPetHomeDialogue(DEFAULT_PET_ID, homeDialogueIndexRef.current);
    homeDialogueIndexRef.current = next.index;
    setHomeDialogue(next);
  }, []);

  const handlePetTap = () => {
    chooseHomeDialogue();
    onPetTap();
  };

  return (
    <section className="journey-layout" aria-labelledby="journey-title">
      <aside className="pet-zone">
        <Pet mood={petMood} reducedMotion={reducedMotion} onTap={handlePetTap} message={homeDialogue.dialogue.text} messageTone={homeDialogue.dialogue.tone} />
      </aside>

      <div className="journey-center">
        <div className="launch-panel">
          <div className="launch-title-tag"><h1 id="journey-title">Ba lô thám hiểm</h1></div>
          <p>Cùng Cáo Nhỏ tìm những điều thú vị trong Lịch sử &amp; Địa lí 4.</p>
          <button className="primary-cta" type="button" onClick={onOpenLessons}>
            Khám phá ngay <ArrowIcon size={25} />
          </button>
        </div>
      </div>

      <JourneyFeatureRail onOpenFriends={onOpenFriends ?? (() => undefined)} friendsUnreadCount={friendsUnreadCount ?? 0} onOpenChallenge={onOpenChallenge} onOpenProgress={onOpenProgress} progressBoardEnabled={progressBoardEnabled} />
    </section>
  );
}
