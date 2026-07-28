/**
 * Three-column feature callout row. Icon props take a react-icons
 * component (not an element) so they can be sized/colored here.
 *
 * @param {{
 *   IoHeadset: React.ComponentType,
 *   IoPeopleSharp: React.ComponentType,
 *   IoPerson: React.ComponentType,
 *   firstTitle: string, firstText: string,
 *   secondTitle: string, secondText: string,
 *   thirdTitle: string, thirdText: string,
 * }} props
 */
export const FooterCommit = ({
  IoHeadset,
  IoPeopleSharp,
  IoPerson,
  firstTitle,
  firstText,
  secondTitle,
  secondText,
  thirdTitle,
  thirdText,
}) => {
  const items = [
    { Icon: IoHeadset, title: firstTitle, text: firstText },
    { Icon: IoPeopleSharp, title: secondTitle, text: secondText },
    { Icon: IoPerson, title: thirdTitle, text: thirdText },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 pt-8">
      {items.map(({ Icon, title, text }) => (
        <div key={title} className="flex gap-4 items-start">
          <div className="shrink-0 w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            {Icon && <Icon className="text-primary text-2xl" />}
          </div>
          <div className="space-y-1">
            <h4 className="font-bold text-secondary">{title}</h4>
            <p className="text-gray-800 text-sm">{text}</p>
          </div>
        </div>
      ))}
    </div>
  );
};