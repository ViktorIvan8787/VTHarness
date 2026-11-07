/** Plain VT lettering for the VT-Harness home link. */
export function VtMark({ className = "" }: { className?: string }) {
	return (
		<svg viewBox="160 270 760 484" className={className} aria-hidden="true" fill="currentColor">
			<path d="M190 300H285L377 585L469 300H564L420 724H334Z M585 300H890V387H782V724H690V387H585Z" />
		</svg>
	);
}
