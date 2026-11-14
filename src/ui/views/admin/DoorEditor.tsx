import { useState } from 'react';
import { saveDoor, type EditableDoor } from '../../../application/useCases/doorEditor';
import { MAX_OPTIONS, OPTION_IDS, type DoorDraft } from '../../../domain/doorDraft';
import { isScored } from '../../../domain/scoring';
import type { ContentList, DoorContent, DoorKind } from '../../../domain/types';
import { DoorBody } from '../../components/door/DoorBody';
import { KIND_LABELS } from '../../components/door/kindLabels';
import { useServices } from '../../hooks/servicesContext';
import { toError } from '../../hooks/useAsync';
import { readImageFile } from './imageFile';

interface DoorEditorProps {
  door: EditableDoor;
  onDone: (saved: boolean) => void;
}

const KINDS: DoorKind[] = ['quiz', 'riddle', 'dingbat', 'challenge', 'surprise'];

const KIND_HELP: Record<DoorKind, string> = {
  quiz: 'Flervalg med ett riktig svar. Gir poeng.',
  riddle: 'Fritekst-svar. Gir poeng. Store/små bokstaver og små skrivefeil godtas automatisk.',
  dingbat: 'Et bilde å tolke, med fritekst-svar. Gir poeng.',
  challenge: 'Noe å gjøre i virkeligheten. Gir 🎯 på poengtavla, ikke poeng.',
  surprise: 'Vitser, oppskrifter, hilsener … Ingenting å svare på.',
};

export function DoorEditor({ door, onDone }: DoorEditorProps) {
  const { services, notifyChanged } = useServices();
  const [draft, setDraft] = useState<DoorDraft>(door.draft);
  const [bodyText, setBodyText] = useState(door.draft.body.join('\n\n'));
  const [acceptedText, setAcceptedText] = useState(door.draft.accepted.join('\n'));
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const update = (patch: Partial<DoorDraft>) => setDraft((d) => ({ ...d, ...patch }));

  const fullDraft = (): DoorDraft => ({
    ...draft,
    body: bodyText.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
    accepted: acceptedText.split('\n').map((a) => a.trim()).filter(Boolean),
  });

  const save = async () => {
    setSaving(true);
    setError(undefined);
    try {
      await saveDoor(services, fullDraft());
      notifyChanged();
      onDone(true);
    } catch (e) {
      setError(toError(e).message);
      setSaving(false);
    }
  };

  const pickImage = async (file?: File) => {
    if (!file) return;
    try {
      update({ image: await readImageFile(file) });
      setError(undefined);
    } catch (e) {
      setError(toError(e).message);
    }
  };

  const scored = isScored({ kind: draft.kind });

  return (
    <form
      className="card question-form door-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void save();
      }}
    >
      <h3>
        Luke {draft.day} {door.exists ? '– rediger' : '– ny luke'}
      </h3>

      {door.answerCount > 0 && scored && (
        <p className="notice">
          ⚠️ {door.answerCount} har allerede svart på denne luken. Endrer du fasiten, blir svarene deres ikke rettet på
          nytt.
        </p>
      )}

      <label>
        Type
        <select className="input" value={draft.kind} onChange={(e) => update({ kind: e.target.value as DoorKind })}>
          {KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </select>
        <small className="door-editor__help">{KIND_HELP[draft.kind]}</small>
      </label>

      <label>
        Tittel
        <input className="input" value={draft.title} maxLength={60} onChange={(e) => update({ title: e.target.value })} />
      </label>

      <label>
        {scored ? 'Spørsmål' : 'Innledning (valgfritt)'}
        <textarea className="input" rows={2} value={draft.prompt} onChange={(e) => update({ prompt: e.target.value })} />
      </label>

      {draft.kind === 'quiz' && <QuizOptions draft={draft} update={update} />}

      {(draft.kind === 'riddle' || draft.kind === 'dingbat') && (
        <label>
          Godkjente svar (ett per linje)
          <textarea
            className="input"
            rows={3}
            value={acceptedText}
            placeholder={'juletre\njuletreet\ngran'}
            onChange={(e) => setAcceptedText(e.target.value)}
          />
          <small className="door-editor__help">
            «En/ei/et», tegnsetting, store/små bokstaver og små skrivefeil godtas uansett. Legg inn andre ord som også
            er riktige.
          </small>
        </label>
      )}

      {scored && (
        <label>
          Fasit som vises etter svar (valgfritt)
          <input
            className="input"
            value={draft.display}
            placeholder={draft.kind === 'quiz' ? 'Standard: det riktige alternativet' : 'Standard: første godkjente svar'}
            onChange={(e) => update({ display: e.target.value })}
          />
        </label>
      )}

      <ImageField draft={draft} update={update} onPick={pickImage} required={draft.kind === 'dingbat'} />

      {!scored && (
        <label>
          Tekst (tom linje mellom avsnitt)
          <textarea className="input" rows={5} value={bodyText} onChange={(e) => setBodyText(e.target.value)} />
        </label>
      )}

      {!scored && <ListsEditor lists={draft.lists} onChange={(lists) => update({ lists })} />}

      {scored && (
        <label>
          Visste du at … (vises etter svar, valgfritt)
          <textarea className="input" rows={2} value={draft.funFact ?? ''} onChange={(e) => update({ funFact: e.target.value })} />
        </label>
      )}

      {preview && (
        <div className="door-editor__preview">
          <p className="door-kind">{KIND_LABELS[draft.kind]}</p>
          {draft.title && <h3 className="door-title">{draft.title}</h3>}
          <DoorBody content={previewContent(fullDraft())} />
          {draft.kind === 'quiz' && (
            <ol className="door-editor__preview-options" type="A">
              {draft.options.map((o, i) => (
                <li key={i}>{o}</li>
              ))}
            </ol>
          )}
        </div>
      )}

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}

      <div className="question-form__buttons">
        <button type="button" className="button" onClick={() => setPreview((p) => !p)}>
          {preview ? 'Skjul forhåndsvisning' : '👀 Forhåndsvis'}
        </button>
        <button type="button" className="button" onClick={() => onDone(false)} disabled={saving}>
          Avbryt
        </button>
        <button type="submit" className="button button--primary" disabled={saving}>
          {saving ? 'Lagrer…' : 'Lagre luke'}
        </button>
      </div>
    </form>
  );
}

function QuizOptions({ draft, update }: { draft: DoorDraft; update: (patch: Partial<DoorDraft>) => void }) {
  const setOption = (index: number, text: string) =>
    update({ options: draft.options.map((o, i) => (i === index ? text : o)) });
  const remove = (index: number) =>
    update({
      options: draft.options.filter((_, i) => i !== index),
      correctIndex: draft.correctIndex === index ? 0 : draft.correctIndex > index ? draft.correctIndex - 1 : draft.correctIndex,
    });

  return (
    <fieldset className="question-form__options">
      <legend>Svaralternativer – kryss av det riktige</legend>
      {draft.options.map((option, index) => (
        <div key={index} className="question-form__option">
          <input
            type="radio"
            name="correct"
            checked={draft.correctIndex === index}
            onChange={() => update({ correctIndex: index })}
            aria-label={`Alternativ ${OPTION_IDS[index].toUpperCase()} er riktig`}
          />
          <input
            className="input"
            value={option}
            placeholder={`Alternativ ${OPTION_IDS[index].toUpperCase()}`}
            onChange={(e) => setOption(index, e.target.value)}
          />
          {draft.options.length > 2 && (
            <button type="button" className="button button--small" onClick={() => remove(index)} aria-label="Fjern alternativ">
              ✕
            </button>
          )}
        </div>
      ))}
      {draft.options.length < MAX_OPTIONS && (
        <button type="button" className="button button--small" onClick={() => update({ options: [...draft.options, ''] })}>
          + Legg til alternativ
        </button>
      )}
    </fieldset>
  );
}

function ImageField({
  draft,
  update,
  onPick,
  required,
}: {
  draft: DoorDraft;
  update: (patch: Partial<DoorDraft>) => void;
  onPick: (file?: File) => Promise<void>;
  required: boolean;
}) {
  return (
    <div className="door-editor__image">
      <label>
        Bilde {required ? '' : '(valgfritt)'}
        <input type="file" accept="image/*" onChange={(e) => void onPick(e.target.files?.[0])} />
      </label>
      {draft.image && (
        <>
          <img src={imageSrc(draft.image)} alt="" className="door-editor__thumb" />
          <label>
            Bildetekst for skjermlesere
            <input className="input" value={draft.imageAlt ?? ''} onChange={(e) => update({ imageAlt: e.target.value })} />
          </label>
          <button type="button" className="button button--small" onClick={() => update({ image: undefined, imageAlt: undefined })}>
            Fjern bilde
          </button>
        </>
      )}
    </div>
  );
}

function ListsEditor({ lists, onChange }: { lists: ContentList[]; onChange: (lists: ContentList[]) => void }) {
  const set = (index: number, patch: Partial<ContentList>) =>
    onChange(lists.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  return (
    <fieldset className="question-form__options">
      <legend>Lister (f.eks. vitser, ingredienser, fremgangsmåte)</legend>
      {lists.map((list, index) => (
        <div key={index} className="door-editor__list">
          <input
            className="input"
            value={list.title ?? ''}
            placeholder="Overskrift (valgfritt)"
            onChange={(e) => set(index, { title: e.target.value })}
          />
          <textarea
            className="input"
            rows={4}
            value={list.items.join('\n')}
            placeholder="Ett punkt per linje"
            onChange={(e) => set(index, { items: e.target.value.split('\n') })}
          />
          <div className="question-form__option">
            <label className="door-editor__checkbox">
              <input type="checkbox" checked={!!list.ordered} onChange={(e) => set(index, { ordered: e.target.checked })} />{' '}
              Nummerert
            </label>
            <button type="button" className="button button--small" onClick={() => onChange(lists.filter((_, i) => i !== index))}>
              Fjern liste
            </button>
          </div>
        </div>
      ))}
      <button type="button" className="button button--small" onClick={() => onChange([...lists, { items: [] }])}>
        + Legg til liste
      </button>
    </fieldset>
  );
}

function imageSrc(image: string): string {
  return image.startsWith('data:') ? image : `${import.meta.env.BASE_URL}${image}`;
}

function previewContent(draft: DoorDraft): DoorContent {
  return {
    id: 'preview',
    day: draft.day,
    kind: draft.kind,
    title: draft.title,
    prompt: draft.prompt || undefined,
    body: draft.body,
    lists: draft.lists.map((l) => ({ ...l, items: l.items.filter((i) => i.trim()) })),
    image: draft.image,
    imageAlt: draft.imageAlt,
  };
}
