'use client';

import AppShell from '@/components/AppShell';
import { Shield, FileText, Scale, AlertTriangle, Copyright } from 'lucide-react';

export default function TermsOfService() {
    return (
        <AppShell>
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-[#1e293b]/50 border border-[#334155] rounded-3xl p-8 md:p-12 shadow-xl">
                    <div className="text-center mb-12">
                        <h1 className="text-3xl md:text-4xl font-black text-white mb-4">Terms of Service</h1>
                        <p className="text-[#94a3b8] text-lg">Last updated: February 6, 2026</p>
                    </div>

                    <div className="space-y-12">
                        {/* 1. Introduction */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-blue-500 mb-2">
                                <FileText className="w-6 h-6" />
                                <h2 className="text-xl font-bold">1. Introduction</h2>
                            </div>
                            <p className="text-[#cbd5e1] leading-relaxed">
                                Welcome to Shine Bu Chay Social. By accessing or using our platform, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the service.
                            </p>
                        </section>

                        {/* 2. User Content & Copyright */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-purple-500 mb-2">
                                <Copyright className="w-6 h-6" />
                                <h2 className="text-xl font-bold">2. User Content & Copyright</h2>
                            </div>
                            <div className="bg-[#0f172a]/50 rounded-xl p-6 border border-[#334155]/50">
                                <p className="text-[#cbd5e1] leading-relaxed mb-4">
                                    Our service allows you to post links, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content").
                                </p>
                                <ul className="space-y-3 list-disc pl-5 text-[#94a3b8]">
                                    <li>You are responsible for the Content that you post to the service, including its legality, reliability, and appropriateness.</li>
                                    <li>We do not claim ownership of user-generated content, but by posting content, you grant us a license to use it for the operation of the service.</li>
                                    <li><strong>Copyright Infringement:</strong> Users must not upload content that violates intellectual property rights. We reserve the right to remove any content that allegedly infringes copyright.</li>
                                </ul>
                            </div>
                        </section>

                        {/* 3. Prohibited Activities */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-red-500 mb-2">
                                <AlertTriangle className="w-6 h-6" />
                                <h2 className="text-xl font-bold">3. Prohibited Activities</h2>
                            </div>
                            <p className="text-[#cbd5e1] leading-relaxed">
                                You agree not to engage in any of the following prohibited activities:
                            </p>
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                {[
                                    "Harassment or hate speech",
                                    "Posting illegal content",
                                    "Spamming or automated posting",
                                    "Impersonating others",
                                    "Distributing malware",
                                    "Violating privacy of others"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-2 text-[#94a3b8]">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* 4. Reporting & Content Moderation */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-green-500 mb-2">
                                <Shield className="w-6 h-6" />
                                <h2 className="text-xl font-bold">4. Reporting & Moderation</h2>
                            </div>
                            <p className="text-[#cbd5e1] leading-relaxed">
                                We strive to maintain a safe community. Users can report inappropriate content using the "Report" feature. We review reports and take appropriate action, which may include removing content or suspending accounts.
                            </p>
                        </section>

                        {/* 5. Limitation of Liability */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-3 text-yellow-500 mb-2">
                                <Scale className="w-6 h-6" />
                                <h2 className="text-xl font-bold">5. Limitation of Liability</h2>
                            </div>
                            <p className="text-[#cbd5e1] leading-relaxed">
                                In no event shall Shine Bu Chay Social, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses.
                            </p>
                        </section>
                    </div>

                    <div className="mt-12 pt-8 border-t border-[#334155] text-center text-[#64748b] text-sm">
                        <p>Questions? Contact us at support@shinebuchay.com</p>
                    </div>
                </div>
            </div>
        </AppShell>
    );
}
