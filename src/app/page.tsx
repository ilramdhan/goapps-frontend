"use client"

import Image from "next/image"
import Link from "next/link"
import { useAuth } from "@/providers/auth-provider"
import { siteConfig } from "@/config/site"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { ThemeToggle } from "@/components/layout/header/theme-toggle"
import { ArrowRight, LayoutDashboard, LogIn } from "lucide-react"
import { DynamicIcon } from "lucide-react/dynamic"
import { usePublicLanding, getSettingValue, getSectionsByType } from "@/hooks/use-public-landing"
import { CMSSectionType } from "@/types/generated/iam/v1/cms"
import { pascalToIconName } from "@/types/iam/menu"

const DEFAULT_FEATURE_ICON = "Zap"

// Fallback data when CMS is not available
const fallbackFeatures = [
    { iconName: "Server", title: "Microservice Architecture", description: "Built on Go gRPC microservices with clean architecture and domain-driven design for reliability and scalability." },
    { iconName: "Shield", title: "Enterprise Security", description: "Role-based access control, two-factor authentication, JWT tokens, and comprehensive audit logging." },
    { iconName: "BarChart3", title: "Real-time Monitoring", description: "Prometheus metrics, Grafana dashboards, and distributed tracing with Jaeger for full observability." },
    { iconName: "Users", title: "Multi-department", description: "Finance, HR, IT, CI, and Export-Import modules with granular permissions per department and role." },
    { iconName: "Layers", title: "Kubernetes Native", description: "Deployed on K3s with ArgoCD GitOps, auto-scaling, automated backups, and zero-downtime deployments." },
    { iconName: "Zap", title: "Modern Frontend", description: "Next.js 16 with React 19, TailwindCSS 4, and shadcn/ui for a fast, accessible, and responsive interface." },
]

const fallbackFaqs = [
    { question: "What is GoApps?", answer: "GoApps is a semi-ERP platform designed for manufacturing companies. It provides integrated modules for Finance, HR, IT, Continuous Improvement, and Export-Import operations — all accessible from a single dashboard." },
    { question: "Who can access the platform?", answer: "Access is managed through role-based permissions. Each user is assigned roles that determine which modules and features they can use. Administrators can configure roles and permissions from the Administrator panel." },
    { question: "What technology powers GoApps?", answer: "The backend uses Go with gRPC microservices following clean architecture patterns. The frontend is built with Next.js 16 and React 19. Everything runs on a Kubernetes cluster with ArgoCD for GitOps deployments." },
    { question: "Is my data secure?", answer: "Yes. GoApps uses JWT-based authentication with refresh tokens, optional two-factor authentication (TOTP), encrypted connections (TLS), and maintains a complete audit trail of all user actions." },
    { question: "Can I export data?", answer: "Every master data module supports Excel export and import. You can export filtered data, download import templates, and bulk-import records with duplicate handling (skip, update, or error)." },
    { question: "How do I get started?", answer: "Contact your system administrator to receive login credentials. Once logged in, the dashboard will show the modules available to your role. The sidebar navigation is dynamic and adapts to your permissions." },
]

export default function HomePage() {
    const { isAuthenticated, isLoading } = useAuth()
    const { data: landing } = usePublicLanding()

    const settings = landing?.settings ?? []
    const sections = landing?.sections ?? []

    // Derive CMS content with fallbacks
    const siteName = getSettingValue(settings, "site_name", siteConfig.name)
    const orgName = getSettingValue(settings, "organization_name", siteConfig.organization.name)
    const footerCopyright = getSettingValue(settings, "footer_copyright", `${siteConfig.organization.name}. All rights reserved.`)
    const featuresHeading = getSettingValue(settings, "features_heading", "Built for Enterprise")
    const featuresDescription = getSettingValue(settings, "features_description", "GoApps brings together the tools your departments need — from financial master data to user management — in a secure, performant, and maintainable platform.")

    // Hero section from CMS
    const heroSections = getSectionsByType(sections, CMSSectionType.CMS_SECTION_TYPE_HERO)
    const hero = heroSections[0]
    const heroTitle = hero?.title || "Enterprise Platform for Modern Manufacturing"
    const heroSubtitle = hero?.subtitle || "A unified semi-ERP platform powering Finance, HR, IT, and Operations — built with Go microservices and deployed on Kubernetes for reliability at scale."
    const heroContent = hero?.content || ""
    const heroImageUrl = hero?.imageUrl || ""
    const heroCtaText = hero?.buttonText || getSettingValue(settings, "hero_cta_text", "Sign In to Get Started")
    const heroCtaUrl = hero?.buttonUrl || getSettingValue(settings, "hero_cta_url", "/login")

    // Features from CMS or fallback
    const cmsFeatures = getSectionsByType(sections, CMSSectionType.CMS_SECTION_TYPE_FEATURE)
    const features = cmsFeatures.length > 0
        ? cmsFeatures.map((f) => ({
            iconName: f.iconName || DEFAULT_FEATURE_ICON,
            title: f.title,
            subtitle: f.subtitle,
            description: f.content,
            imageUrl: f.imageUrl,
        }))
        : fallbackFeatures.map((f) => ({ ...f, subtitle: "", imageUrl: "" }))

    // FAQ from CMS or fallback
    const cmsFaqs = getSectionsByType(sections, CMSSectionType.CMS_SECTION_TYPE_FAQ)
    const faqs = cmsFaqs.length > 0
        ? cmsFaqs.map((f) => ({
            question: f.title,
            answer: f.subtitle || f.content,
        }))
        : fallbackFaqs

    return (
        <div className="flex min-h-svh flex-col bg-background">
            {/* Background decorations */}
            <div className="fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
                <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/3 blur-3xl" />
            </div>

            {/* Header */}
            <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
                    <Link href="/" className="flex items-center gap-3">
                        <Image
                            src="/logo.png"
                            alt={siteName}
                            width={32}
                            height={32}
                        />
                        <span className="text-lg font-semibold tracking-tight">
                            {siteName}
                        </span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <ThemeToggle />
                        {isLoading ? (
                            <Skeleton className="h-9 w-28" />
                        ) : isAuthenticated ? (
                            <Button asChild>
                                <Link href="/dashboard">
                                    <LayoutDashboard className="h-4 w-4" />
                                    Dashboard
                                </Link>
                            </Button>
                        ) : (
                            <Button asChild>
                                <Link href="/login">
                                    <LogIn className="h-4 w-4" />
                                    Sign In
                                </Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero Section */}
                <section className="mx-auto max-w-6xl px-6 py-20 text-center md:py-32">
                    <div className="mx-auto max-w-3xl space-y-6">
                        {heroImageUrl ? (
                            <Image
                                src={heroImageUrl}
                                alt={heroTitle}
                                width={72}
                                height={72}
                                className="mx-auto"
                            />
                        ) : (
                            <Image
                                src="/logo.png"
                                alt={siteName}
                                width={72}
                                height={72}
                                className="mx-auto"
                            />
                        )}
                        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                            {heroTitle}
                        </h1>
                        <p className="mx-auto max-w-2xl text-balance text-lg text-muted-foreground">
                            {heroSubtitle}
                        </p>
                        {heroContent && (
                            <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
                                {heroContent}
                            </p>
                        )}
                        <p className="text-sm font-medium text-muted-foreground">
                            {orgName}
                        </p>
                        <div className="flex items-center justify-center gap-4 pt-4">
                            {isLoading ? (
                                <Skeleton className="h-11 w-56" />
                            ) : isAuthenticated ? (
                                <Button size="lg" asChild>
                                    <Link href="/dashboard">
                                        Go to Dashboard
                                        <ArrowRight className="h-4 w-4" />
                                    </Link>
                                </Button>
                            ) : (
                                <>
                                    <Button size="lg" asChild>
                                        <Link href={heroCtaUrl}>
                                            {heroCtaText}
                                            <ArrowRight className="h-4 w-4" />
                                        </Link>
                                    </Button>
                                    <Button size="lg" variant="outline" asChild>
                                        <Link href="#about">Learn More</Link>
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                <Separator />

                {/* About / Features Section */}
                <section id="about" className="mx-auto max-w-6xl px-6 py-20">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            {featuresHeading}
                        </h2>
                        <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                            {featuresDescription}
                        </p>
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                        {features.map((feature) => (
                            <Card key={feature.title} className="border-border/50">
                                <CardContent className="pt-6">
                                    {feature.imageUrl ? (
                                        <div className="mb-4">
                                            <Image
                                                src={feature.imageUrl}
                                                alt={feature.title}
                                                width={40}
                                                height={40}
                                                className="rounded-lg"
                                            />
                                        </div>
                                    ) : (
                                        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                                            <DynamicIcon
                                                name={pascalToIconName(feature.iconName) ?? "zap"}
                                                className="h-5 w-5 text-primary"
                                            />
                                        </div>
                                    )}
                                    <h3 className="mb-2 font-semibold">{feature.title}</h3>
                                    {feature.subtitle && (
                                        <p className="mb-1 text-sm font-medium text-foreground/80">
                                            {feature.subtitle}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground">
                                        {feature.description}
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                <Separator />

                {/* FAQ Section */}
                <section id="faq" className="mx-auto max-w-3xl px-6 py-20">
                    <div className="mb-12 text-center">
                        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                            Frequently Asked Questions
                        </h2>
                        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
                            Common questions about the GoApps platform.
                        </p>
                    </div>
                    <Accordion type="single" collapsible className="w-full">
                        {faqs.map((faq, index) => (
                            <AccordionItem key={index} value={`item-${index}`}>
                                <AccordionTrigger className="text-left">
                                    {faq.question}
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground">
                                    {faq.answer}
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </section>
            </main>

            {/* Footer */}
            <footer className="border-t bg-muted/30">
                <div className="mx-auto max-w-6xl px-6 py-8">
                    <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
                        <div className="flex items-center gap-3">
                            <Image
                                src="/logo.png"
                                alt={siteName}
                                width={24}
                                height={24}
                            />
                            <span className="text-sm font-medium">
                                {siteName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                                v{siteConfig.version}
                            </span>
                        </div>
                        <div className="flex items-center gap-6">
                            <Link
                                href="/privacy"
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Privacy Policy
                            </Link>
                            <Link
                                href="/terms"
                                className="text-sm text-muted-foreground hover:text-foreground"
                            >
                                Terms of Service
                            </Link>
                        </div>
                    </div>
                    <Separator className="my-6" />
                    <p className="text-center text-xs text-muted-foreground">
                        &copy; {new Date().getFullYear()}{" "}
                        {footerCopyright}
                    </p>
                </div>
            </footer>
        </div>
    )
}
