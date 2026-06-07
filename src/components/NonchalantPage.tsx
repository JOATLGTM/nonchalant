import { useRef, useState, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { SignupSchema, type SignupData } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
import { Grain } from "./Grain";

type PageState = "intro" | "form" | "done";

interface FormErrors {
	full_name?: string;
	email?: string;
	phone?: string;
	party_size?: string;
	general?: string;
}

export function NonchalantPage() {
	const containerRef = useRef<HTMLDivElement>(null);
	const introRef = useRef<HTMLDivElement>(null);
	const formContainerRef = useRef<HTMLDivElement>(null);
	const confirmRef = useRef<HTMLDivElement>(null);
	const ctaRef = useRef<HTMLButtonElement>(null);
	const formFieldsRef = useRef<HTMLDivElement>(null);
	const confirmContentRef = useRef<HTMLDivElement>(null);

	const [pageState, setPageState] = useState<PageState>("intro");
	const [formData, setFormData] = useState<Partial<SignupData>>({});
	const [errors, setErrors] = useState<FormErrors>({});
	const [isSubmitting, setIsSubmitting] = useState(false);

	// ── GSAP Entrance + CTA Reveal ──
	useGSAP(
		() => {
			if (!introRef.current || !ctaRef.current) return;

			// Wordmark entrance
			gsap.fromTo(
				introRef.current.querySelector(".wordmark-wrapper"),
				{ opacity: 0, y: 24, filter: "blur(8px)" },
				{
					opacity: 1,
					y: 0,
					filter: "blur(0px)",
					duration: 1.4,
					ease: "power3.out",
				},
			);

			// CTA reveal at 3s
			gsap.to(ctaRef.current, {
				opacity: 1,
				duration: 1,
				ease: "power2.out",
				delay: 2,
			});
		},
		{ scope: containerRef },
	);

	// ── INTRO → FORM transition ──
	const goToForm = useCallback(() => {
		if (
			!introRef.current ||
			!formContainerRef.current ||
			!formFieldsRef.current
		)
			return;

		const tl = gsap.timeline({
			onComplete: () => setPageState("form"),
		});

		// Fade/blur intro out
		tl.to(introRef.current, {
			opacity: 0,
			filter: "blur(6px)",
			duration: 0.7,
			ease: "power2.in",
		});

		tl.set(introRef.current, { display: "none" });

		// Reveal form container
		tl.set(formContainerRef.current, { display: "flex", opacity: 0 });
		tl.to(formContainerRef.current, {
			opacity: 1,
			duration: 0.9,
			ease: "power3.out",
		});

		// Stagger form children
		const fields = formFieldsRef.current.children;
		tl.fromTo(
			fields,
			{ y: 16, opacity: 0 },
			{
				y: 0,
				opacity: 1,
				stagger: 0.07,
				duration: 0.5,
				ease: "power2.out",
			},
			"-=0.5",
		);
	}, []);

	// ── FORM → CONFIRMATION transition ──
	const goToConfirmation = useCallback(() => {
		if (
			!formContainerRef.current ||
			!confirmRef.current ||
			!confirmContentRef.current
		)
			return;

		const tl = gsap.timeline({
			onComplete: () => setPageState("done"),
		});

		// Fade/blur form out
		tl.to(formContainerRef.current, {
			opacity: 0,
			filter: "blur(6px)",
			duration: 0.7,
			ease: "power2.in",
		});

		tl.set(formContainerRef.current, { display: "none" });

		// Reveal confirmation
		tl.set(confirmRef.current, { display: "flex", opacity: 0 });
		tl.to(confirmRef.current, {
			opacity: 1,
			duration: 1.0,
			ease: "power3.out",
		});

		// Optional brass hairline
		const hairline =
			confirmContentRef.current.querySelector(".confirm-hairline");
		if (hairline) {
			tl.fromTo(
				hairline,
				{ scaleX: 0 },
				{ scaleX: 1, duration: 0.8, ease: "power2.out" },
				"-=0.3",
			);
		}
	}, []);

	// ── FORM → INTRO (Escape key) ──
	const goToIntro = useCallback(() => {
		if (!formContainerRef.current || !introRef.current) return;

		const tl = gsap.timeline({
			onComplete: () => setPageState("intro"),
		});

		tl.to(formContainerRef.current, {
			opacity: 0,
			filter: "blur(6px)",
			duration: 0.5,
			ease: "power2.in",
		});

		tl.set(formContainerRef.current, { display: "none" });

		tl.set(introRef.current, {
			display: "flex",
			opacity: 0,
			filter: "blur(0px)",
		});
		tl.to(introRef.current, {
			opacity: 1,
			duration: 0.8,
			ease: "power2.out",
		});
	}, []);

	// ── Escape key handler ──
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape" && pageState === "form") {
				goToIntro();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [pageState, goToIntro]);

	// ── Form validation ──
	const validateField = useCallback(
		(name: keyof SignupData, value: unknown): string | undefined => {
			const fieldSchema = SignupSchema.shape[name];
			if (!fieldSchema) return undefined;

			const result = fieldSchema.safeParse(value);
			if (!result.success) {
				return result.error.issues[0]?.message;
			}
			return undefined;
		},
		[],
	);

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const { name, value } = e.target;
			setFormData((prev) => ({ ...prev, [name]: value }));
			// Clear error on change
			setErrors((prev) => ({ ...prev, [name]: undefined }));
		},
		[],
	);

	const handleBlur = useCallback(
		(e: React.FocusEvent<HTMLInputElement>) => {
			const { name, value } = e.target;
			if (name === "company") return; // skip honeypot
			const error = validateField(name as keyof SignupData, value);
			if (error) {
				setErrors((prev) => ({ ...prev, [name]: error }));
			}
		},
		[validateField],
	);

	// ── Form submission ──
	const handleSubmit = useCallback(
		async (e: React.FormEvent) => {
			e.preventDefault();
			setErrors({});

			// Validate all fields
			const result = SignupSchema.safeParse(formData);
			if (!result.success) {
				const fieldErrors: FormErrors = {};
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				result.error.issues.forEach((err: any) => {
					const path = err.path[0] as keyof FormErrors;
					if (!fieldErrors[path]) {
						fieldErrors[path] = err.message;
					}
				});
				setErrors(fieldErrors);
				return;
			}

			// Honeypot check (client-side early exit)
			if (result.data.company) {
				goToConfirmation();
				return;
			}

			setIsSubmitting(true);

			try {
				const { company, ...row } = result.data;
				const { error } = await supabase
					.from("interest_signups")
					.insert(row);

				if (error) {
					console.error(
						"[interest_signups insert] Supabase error:",
						error,
					);
					setErrors({
						general: "Something went wrong. Please try again.",
					});
					setIsSubmitting(false);
					return;
				}

				goToConfirmation();
			} catch (err) {
				console.error(
					"[interest_signups insert] Unexpected error:",
					err,
				);
				setErrors({
					general: "Something went wrong. Please try again.",
				});
				setIsSubmitting(false);
			}
		},
		[formData, goToConfirmation],
	);

	// ── Focus first form field when form appears ──
	useEffect(() => {
		if (pageState === "form") {
			const firstInput = formContainerRef.current?.querySelector(
				'input[name="full_name"]',
			) as HTMLInputElement | null;
			if (firstInput) {
				setTimeout(() => firstInput.focus(), 100);
			}
		}
	}, [pageState]);

	// ── Focus confirmation when done ──
	useEffect(() => {
		if (pageState === "done") {
			const confirmEl = confirmRef.current;
			if (confirmEl) {
				confirmEl.focus();
			}
		}
	}, [pageState]);

	return (
		<div
			ref={containerRef}
			className="relative min-h-screen w-full overflow-hidden"
			style={{ background: "var(--bg)" }}
		>
			{/* Background layers */}
			<div
				className="fixed inset-0 pointer-events-none"
				style={{
					background: `
            radial-gradient(ellipse 80% 60% at 50% 100%, transparent 30%, #060606 100%),
            radial-gradient(ellipse 50% 40% at 50% 45%, rgba(184,153,104,0.06) 0%, transparent 70%)
          `,
					zIndex: 1,
				}}
			/>

			{/* Grain overlay */}
			<Grain />

			{/* INTRO STATE */}
			<div
				ref={introRef}
				className="fixed inset-0 flex flex-col items-center justify-center"
				style={{ zIndex: 10 }}
			>
				<div className="wordmark-wrapper text-center">
					<span className="wordmark">
						<span className="crt-text" data-text="NON">
							NON
							<span className="crt-scanlines" />
						</span>
						<span className="wordmark-rest">CHALANT</span>
					</span>
				</div>

				<button
					ref={ctaRef}
					onClick={goToForm}
					className="cta-link mt-12"
					style={{ opacity: 0 }}
					aria-label="Click here to express interest"
				>
					click here
				</button>
			</div>

			{/* FORM STATE */}
			<div
				ref={formContainerRef}
				className="fixed inset-0 flex items-center justify-center"
				style={{ display: "none", opacity: 0, zIndex: 10 }}
			>
				<div className="w-full max-w-[440px] px-6 py-12">
					<div ref={formFieldsRef}>
						{/* Eyebrow */}
						<p
							className="text-center uppercase"
							style={{
								fontFamily: "'Jost', sans-serif",
								fontSize: "0.75rem",
								fontWeight: 500,
								letterSpacing: "0.22em",
								color: "var(--muted)",
							}}
						>
							A PRIVATE SUPPER CLUB
						</p>

						{/* Title */}
						<h1
							className="text-center mt-3"
							style={{
								fontFamily: "'Cinzel', serif",
								fontSize: "1.5rem",
								fontWeight: 400,
								letterSpacing: "0.12em",
								lineHeight: 1.2,
								color: "var(--ink)",
							}}
						>
							Reserve Your Interest
						</h1>

						{/* Subtitle */}
						<p
							className="text-center mt-3 mb-8"
							style={{
								fontFamily: "'Jost', sans-serif",
								fontSize: "0.875rem",
								lineHeight: 1.5,
								color: "var(--muted)",
							}}
						>
							Curated by Chef Marcos Ju&aacute;rez &middot;
							Cocktails by Hao Ma. Tell us who's coming and we'll
							be in touch.
						</p>

						{/* Form */}
						<form onSubmit={handleSubmit} noValidate>
							{/* Full name */}
							<div className="mb-5">
								<label
									htmlFor="full_name"
									className="form-label"
								>
									Full name{" "}
									<span style={{ color: "var(--accent)" }}>
										*
									</span>
								</label>
								<input
									id="full_name"
									name="full_name"
									type="text"
									autoComplete="name"
									placeholder="Your full name"
									value={formData.full_name || ""}
									onChange={handleChange}
									onBlur={handleBlur}
									className={`form-input ${errors.full_name ? "form-input-error" : ""}`}
									aria-describedby={
										errors.full_name
											? "full_name-error"
											: undefined
									}
									aria-invalid={
										errors.full_name ? "true" : "false"
									}
								/>
								{errors.full_name && (
									<p
										id="full_name-error"
										className="form-error"
										role="alert"
									>
										{errors.full_name}
									</p>
								)}
							</div>

							{/* Email */}
							<div className="mb-5">
								<label htmlFor="email" className="form-label">
									Email{" "}
									<span style={{ color: "var(--accent)" }}>
										*
									</span>
								</label>
								<input
									id="email"
									name="email"
									type="email"
									autoComplete="email"
									placeholder="you@example.com"
									value={formData.email || ""}
									onChange={handleChange}
									onBlur={handleBlur}
									className={`form-input ${errors.email ? "form-input-error" : ""}`}
									aria-describedby={
										errors.email ? "email-error" : undefined
									}
									aria-invalid={
										errors.email ? "true" : "false"
									}
								/>
								{errors.email && (
									<p
										id="email-error"
										className="form-error"
										role="alert"
									>
										{errors.email}
									</p>
								)}
							</div>

							{/* Phone */}
							<div className="mb-5">
								<label htmlFor="phone" className="form-label">
									Phone{" "}
									<span style={{ color: "var(--accent)" }}>
										*
									</span>
								</label>
								<input
									id="phone"
									name="phone"
									type="tel"
									autoComplete="tel"
									placeholder="(555) 123-4567"
									value={formData.phone || ""}
									onChange={handleChange}
									onBlur={handleBlur}
									className={`form-input ${errors.phone ? "form-input-error" : ""}`}
									aria-describedby={
										errors.phone ? "phone-error" : undefined
									}
									aria-invalid={
										errors.phone ? "true" : "false"
									}
								/>
								{errors.phone && (
									<p
										id="phone-error"
										className="form-error"
										role="alert"
									>
										{errors.phone}
									</p>
								)}
							</div>

							{/* Party size */}
							<div className="mb-6">
								<label
									htmlFor="party_size"
									className="form-label"
								>
									Party size{" "}
									<span style={{ color: "var(--accent)" }}>
										*
									</span>
								</label>
								<input
									id="party_size"
									name="party_size"
									type="number"
									min={1}
									max={20}
									placeholder="How many guests?"
									value={formData.party_size || ""}
									onChange={handleChange}
									onBlur={handleBlur}
									className={`form-input ${errors.party_size ? "form-input-error" : ""}`}
									aria-describedby={
										errors.party_size
											? "party_size-error"
											: undefined
									}
									aria-invalid={
										errors.party_size ? "true" : "false"
									}
								/>
								{errors.party_size && (
									<p
										id="party_size-error"
										className="form-error"
										role="alert"
									>
										{errors.party_size}
									</p>
								)}
							</div>

							{/* Honeypot field */}
							<div
								style={{
									position: "absolute",
									left: "-9999px",
									visibility: "hidden",
								}}
								aria-hidden="true"
							>
								<label htmlFor="company">Company</label>
								<input
									id="company"
									name="company"
									type="text"
									tabIndex={-1}
									autoComplete="off"
									value={formData.company || ""}
									onChange={handleChange}
								/>
							</div>

							{/* General error */}
							{errors.general && (
								<p
									className="form-error mb-4 text-center"
									role="alert"
								>
									{errors.general}
								</p>
							)}

							{/* Submit */}
							<button
								type="submit"
								className="submit-btn"
								disabled={isSubmitting}
								aria-busy={isSubmitting}
							>
								{isSubmitting
									? "Sending..."
									: "Submit Interest"}
							</button>
						</form>
					</div>
				</div>
			</div>

			{/* CONFIRMATION STATE */}
			<div
				ref={confirmRef}
				tabIndex={-1}
				className="fixed inset-0 flex flex-col items-center justify-center"
				style={{ display: "none", opacity: 0, zIndex: 10 }}
				aria-live="polite"
			>
				<div
					ref={confirmContentRef}
					className="text-center px-6 max-w-[360px]"
				>
					{/* Checkmark */}
					<span
						style={{
							fontFamily: "'Cinzel', serif",
							fontSize: "2rem",
							color: "var(--accent)",
							display: "block",
							marginBottom: "24px",
						}}
					>
						&#10003;
					</span>

					{/* Title */}
					<h2
						style={{
							fontFamily: "'Cinzel', serif",
							fontSize: "clamp(1.25rem, 5vw, 1.75rem)",
							fontWeight: 400,
							letterSpacing: "0.1em",
							lineHeight: 1.3,
							color: "var(--ink)",
						}}
					>
						You're on the list
					</h2>

					{/* Brass hairline */}
					<div
						className="confirm-hairline mx-auto mt-4"
						style={{
							width: "80px",
							height: "1px",
							backgroundColor: "var(--accent)",
							transform: "scaleX(0)",
							transformOrigin: "center",
						}}
					/>

					{/* Body */}
					<p
						className="mt-4"
						style={{
							fontFamily: "'Jost', sans-serif",
							fontSize: "0.875rem",
							lineHeight: 1.5,
							color: "var(--muted)",
						}}
					>
						We'll reach out with dates for the next NONCHALANT
						supper club.
					</p>
				</div>
			</div>
		</div>
	);
}
