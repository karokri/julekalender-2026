import type { DoorContent } from '../../../domain/types';

/** The content of a door: image, question, text and lists. Also used for the admin preview. */
export function DoorBody({ content }: { content: DoorContent }) {
  return (
    <div className="door-body">
      {content.image && (
        <img className="door-body__image" src={content.image.startsWith('data:') ? content.image : `${import.meta.env.BASE_URL}${content.image}`} alt={content.imageAlt ?? ''} />
      )}
      {content.prompt && <p className="quiz__prompt">{content.prompt}</p>}
      {content.body?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
      {content.lists?.map((list, index) => {
        const items = list.items.map((item) => <li key={item}>{item}</li>);
        return (
          <div key={list.title ?? index} className="door-body__list">
            {list.title && <h3>{list.title}</h3>}
            {list.ordered ? <ol>{items}</ol> : <ul>{items}</ul>}
          </div>
        );
      })}
    </div>
  );
}
