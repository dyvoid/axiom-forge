import { icons } from 'lucide-react';

export type IconName = keyof typeof icons;

interface IconProps {
	name: string;
	size?: number | string;
	className?: string;
}

export function Icon({ name, size = 'var(--icon-size)', className }: IconProps): JSX.Element {
	// Transform schema icon names (e.g., 'map-pin' to 'MapPin')
	const pascalName = name
		.split('-')
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join('') as IconName;

	const LucideIcon = icons[pascalName] || icons.Circle;

	return (
		<LucideIcon
			size={size}
			strokeWidth="var(--icon-stroke)"
			className={className}
			style={{ flexShrink: 0 }}
		/>
	);
}
