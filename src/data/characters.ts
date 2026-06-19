export type MailmanId = 'johnny' | 'dingo' | 'mert';

export type CharacterDef = {
  id: MailmanId;
  name: string;
  tagline: string;
  skin: string;
  jacket: string;
  jacketLight: string;
  jacketTrim: string;
  hat: string;
  hatBrim: string;
  packMain: string;
  packDark: string;
  packTrim: string;
};

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'johnny',
    name: 'Johnny',
    tagline: 'Classic courier',
    skin: '#FFE0BD',
    jacket: '#1565C0',
    jacketLight: '#42A5F5',
    jacketTrim: '#FFD54F',
    hat: '#D32F2F',
    hatBrim: '#B71C1C',
    packMain: '#78909C',
    packDark: '#546E7A',
    packTrim: '#ECEFF1',
  },
  {
    id: 'dingo',
    name: 'Dingo',
    tagline: 'Night-shift legend',
    skin: '#3D2314',
    jacket: '#1A237E',
    jacketLight: '#3949AB',
    jacketTrim: '#00E676',
    hat: '#00897B',
    hatBrim: '#00695C',
    packMain: '#2E7D32',
    packDark: '#1B5E20',
    packTrim: '#A5D6A7',
  },
  {
    id: 'mert',
    name: 'Mert',
    tagline: 'Desert-route pro',
    skin: '#C68642',
    jacket: '#4E342E',
    jacketLight: '#795548',
    jacketTrim: '#FFAB40',
    hat: '#EF6C00',
    hatBrim: '#E65100',
    packMain: '#6D4C41',
    packDark: '#4E342E',
    packTrim: '#FFCC80',
  },
];

export function getCharacter(id: MailmanId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
