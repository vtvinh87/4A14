import { useCallback, useEffect, useRef, useState, type SyntheticEvent } from 'react';
import type { PetMood } from '../motion/pet';
import { pickPetHomeDialogue } from '../motion/petHomeConversation';
import { LockIcon, SparkIcon } from '../components/icons';
import { Pet } from '../components/Pet';
import { DEFAULT_PET_ID, getPetById, isPetUnlocked, PETS, type PetId } from '../content/pets';

type PetViewProps = {
  petMood: PetMood;
  reducedMotion: boolean;
  onPetTap: (petId: PetId) => void;
  onOpenSettings: () => void;
  stamps: readonly string[];
};

export function PetView({ petMood, reducedMotion, onPetTap, onOpenSettings, stamps }: PetViewProps) {
  const [selectedPetId, setSelectedPetId] = useState<PetId>(DEFAULT_PET_ID);
  const selectedPet = getPetById(selectedPetId);
  const selectedPetUnlocked = isPetUnlocked(selectedPet, stamps);
  const unlockedCount = PETS.filter((pet) => isPetUnlocked(pet, stamps)).length;
  const activePet = selectedPetUnlocked ? selectedPet : getPetById(DEFAULT_PET_ID);
  const [homeDialogue, setHomeDialogue] = useState(() => pickPetHomeDialogue(activePet.id));
  const homeDialogueIndexRef = useRef(homeDialogue.index);

  const chooseHomeDialogue = useCallback(() => {
    const next = pickPetHomeDialogue(activePet.id, homeDialogueIndexRef.current);
    homeDialogueIndexRef.current = next.index;
    setHomeDialogue(next);
  }, [activePet.id]);

  useEffect(() => {
    chooseHomeDialogue();
  }, [activePet.id, chooseHomeDialogue]);

  const selectPet = (petId: PetId) => {
    setSelectedPetId(petId);
  };

  const handlePetTap = () => {
    chooseHomeDialogue();
    onPetTap(activePet.id);
  };

  const activeImageFallback = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = '/art/fox-pet-alpha.png';
    event.currentTarget.alt = 'Cáo Nhỏ màu cam mặc khăn xanh, đeo ba lô và cầm la bàn';
  };

  return (
    <section className="content-view pet-view" aria-labelledby="pet-title">
      <div className="view-heading"><div className="page-title-tag"><h1 id="pet-title">Pet của tôi</h1></div><button className="secondary-button" type="button" onClick={onOpenSettings}>Cài đặt chuyển động</button></div>
      <div className="pet-room">
        <div className="pet-room-glow" />
        <Pet mood={petMood} reducedMotion={reducedMotion} onTap={handlePetTap} message={homeDialogue.dialogue.text} messageTone={homeDialogue.dialogue.tone} pet={activePet} size="full" />
        <div className="pet-room-caption"><SparkIcon size={18} /><span>{selectedPetUnlocked ? `Chạm vào ${selectedPet.name} để nhận một lời chào.` : selectedPet.unlockGuide}</span></div>
      </div>
      <section className="pet-roster" aria-labelledby="pet-roster-title">
        <div className="pet-roster-heading">
          <div><p className="eyebrow">BẠN ĐỒNG HÀNH</p><h2 id="pet-roster-title">Đội thám hiểm của con</h2></div>
          <span className="pet-roster-count">{unlockedCount}/{PETS.length} đã mở</span>
        </div>
        <div className="pet-roster-grid">
          {PETS.map((pet) => {
            const unlocked = isPetUnlocked(pet, stamps);
            const selected = pet.id === selectedPetId;
            return (
              <button
                className={`pet-card pet-card-${pet.color}${selected ? ' is-selected' : ''}${unlocked ? '' : ' is-locked'}`}
                type="button"
                key={pet.id}
                data-pet-card
                data-pet-id={pet.id}
                data-locked={!unlocked}
                aria-pressed={selected}
                onClick={() => selectPet(pet.id)}
              >
                <span className="pet-card-art-wrap">
                  <img data-pet-art className="pet-card-art" src={pet.image.src} alt={unlocked ? pet.image.alt : ''} aria-hidden={!unlocked} loading="lazy" decoding="async" onError={activeImageFallback} />
                  {!unlocked && <span className="pet-card-lock" aria-hidden="true"><LockIcon size={16} /></span>}
                </span>
                <span className="pet-card-copy"><strong>{pet.name}</strong><small>{unlocked ? (selected ? 'Đang đồng hành' : 'Chạm để chọn') : pet.unlockLabel}</small></span>
              </button>
            );
          })}
        </div>
      </section>
      <article className={`pet-story-card pet-story-${selectedPet.color}${selectedPetUnlocked ? '' : ' is-locked'}`} data-pet-detail data-pet-unlocked={selectedPetUnlocked} aria-live="polite">
        <div className="pet-story-art-wrap"><img data-active-pet-art src={selectedPet.image.src} alt={selectedPet.image.alt} onError={activeImageFallback} />{!selectedPetUnlocked && <span className="pet-story-lock" aria-hidden="true"><LockIcon size={18} /></span>}</div>
        <div className="pet-story-copy">
          <p className="eyebrow">{selectedPetUnlocked ? 'CÂU CHUYỆN ĐỒNG HÀNH' : 'PET ĐANG KHÓA'}</p>
          <h2 data-pet-detail-title>{selectedPet.name}</h2>
          <p className="pet-detail-line" data-pet-description><strong>Mô tả:</strong> {selectedPet.description}</p>
          <p className="pet-detail-line" data-pet-story><strong>Câu chuyện:</strong> {selectedPet.story}</p>
          <p className="pet-detail-line" data-pet-personality><strong>Tính cách:</strong> {selectedPet.personality}</p>
          {!selectedPetUnlocked && <p className="pet-unlock-guide" data-pet-unlock-guide><LockIcon size={15} /> {selectedPet.unlockGuide}</p>}
        </div>
      </article>
    </section>
  );
}
