import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/use-language";

interface TermsOfServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TermsOfServiceDialog({
  open,
  onOpenChange,
}: TermsOfServiceDialogProps) {
  const { translate } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[650px] max-h-[85vh] border-none bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-t-xl"></div>
        <DialogHeader className="pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-indigo-400" />
            <DialogTitle className="text-xl font-bold tracking-tight">
              {translate("auth.termsOfService")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/70 pt-2">
            {translate("auth.lastUpdated")}: July 14, 2025 |{" "}
            {translate("auth.effectiveDate")}: July 14, 2025
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="mt-2 pr-4 max-h-[60vh]">
          <div className="space-y-4 text-white/80 text-sm">
            <div className="bg-gradient-to-r from-red-500/20 to-orange-500/20 border border-red-500/30 rounded-lg p-3 mb-4">
              <p className="text-red-200 font-medium text-xs">
                <strong>{translate("auth.importantNotice")}:</strong>{" "}
                {translate("auth.termsContainArbitration")}
              </p>
            </div>

            <p>{translate("auth.termsOfServiceContent.welcomeText")}</p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.acceptanceAndEligibility")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.agreementToTerms")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.agreementToTermsText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.ageRequirements")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.ageRequirementsText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.geographicRestrictions")}
              </strong>{" "}
              {translate(
                "auth.termsOfServiceContent.geographicRestrictionsText",
              )}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate(
                "auth.termsOfServiceContent.accountCreationAndSecurity",
              )}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.accountRegistration")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.accountRegistrationText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.accountSecurity")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.accountSecurityText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.oneAccountPerPerson")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.oneAccountPerPersonText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.identityVerification")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.identityVerificationText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.userContentAndConduct")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.contentLicense")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.contentLicenseText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.contentStandards")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.contentStandardsText")}
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.0")}
              </li>
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.1")}
              </li>
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.2")}
              </li>
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.3")}
              </li>
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.4")}
              </li>
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.5")}
              </li>
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.6")}
              </li>
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.7")}
              </li>
              <li>
                •{" "}
                {translate("auth.termsOfServiceContent.contentStandardsList.8")}
              </li>
            </ul>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.prohibitedConduct")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.prohibitedConductText")}
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.0",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.1",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.2",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.3",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.4",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.5",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.6",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.7",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.8",
                )}
              </li>
              <li>
                •{" "}
                {translate(
                  "auth.termsOfServiceContent.prohibitedConductList.9",
                )}
              </li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate(
                "auth.termsOfServiceContent.artificialIntelligenceAndMatching",
              )}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.aiTechnology")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.aiTechnologyText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.matchingDisclaimer")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.matchingDisclaimerText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.contentModeration")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.contentModerationText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate(
                "auth.termsOfServiceContent.premiumServicesAndPayments",
              )}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.subscriptionServices")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.subscriptionServicesText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.autoRenewal")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.autoRenewalText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.refunds")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.refundsText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.virtualItems")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.virtualItemsText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.privacyAndDataProtection")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.privacyPolicy")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.privacyPolicyText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.locationData")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.locationDataText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.communications")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.communicationsText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate(
                "auth.termsOfServiceContent.intellectualPropertyRights",
              )}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.charleyIp")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.charleyIpText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.limitedLicense")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.limitedLicenseText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.copyrightPolicy")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.copyrightPolicyText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate(
                "auth.termsOfServiceContent.thirdPartyServicesAndIntegrations",
              )}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.thirdPartyLinks")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.thirdPartyLinksText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.socialMediaIntegration")}
              </strong>{" "}
              {translate(
                "auth.termsOfServiceContent.socialMediaIntegrationText",
              )}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.appStoreTerms")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.appStoreTermsText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.safetyAndSecurity")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.userSafety")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.userSafetyText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.reporting")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.reportingText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.backgroundChecks")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.backgroundChecksText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate(
                "auth.termsOfServiceContent.accountSuspensionAndTermination",
              )}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.terminationByYou")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.terminationByYouText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.terminationByUs")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.terminationByUsText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.effectOfTermination")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.effectOfTerminationText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.disclaimersAndWarranties")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.asIsBasis")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.asIsBasisText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.noGuarantees")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.noGuaranteesText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.userInteractions")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.userInteractionsText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.limitationOfLiability")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.damagesLimitation")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.damagesLimitationText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.totalLiabilityCap")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.totalLiabilityCapText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.userResponsibility")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.userResponsibilityText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.indemnification")}
            </h2>
            <p>{translate("auth.termsOfServiceContent.indemnificationText")}</p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate(
                "auth.termsOfServiceContent.disputeResolutionAndArbitration",
              )}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.mandatoryArbitration")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.mandatoryArbitrationText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.classActionWaiver")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.classActionWaiverText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.arbitrationLocation")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.arbitrationLocationText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.exceptions")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.exceptionsText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.governingLaw")}
            </h2>
            <p>{translate("auth.termsOfServiceContent.governingLawText")}</p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.modificationsToTerms")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.updates")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.updatesText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.continuedUse")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.continuedUseText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.disagreement")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.disagreementText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.miscellaneousProvisions")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.entireAgreement")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.entireAgreementText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.severability")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.severabilityText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.noWaiver")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.noWaiverText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.assignment")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.assignmentText")}
            </p>
            <p className="mt-2">
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.forceMajeure")}
              </strong>{" "}
              {translate("auth.termsOfServiceContent.forceMajeureText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.termsOfServiceContent.contactInformation")}
            </h2>
            <p>
              <strong className="text-indigo-300">
                {translate("auth.termsOfServiceContent.companyInformation")}
              </strong>
              <br />
              {translate("auth.termsOfServiceContent.companyDetails")}
              <br />
              {translate("auth.termsOfServiceContent.companyLine2")}
              <br />
              {translate("auth.termsOfServiceContent.companyLine3")}
              <br />
              {translate("auth.termsOfServiceContent.companyLine4")}
            </p>
            <p className="mt-2">
              {translate("auth.termsOfServiceContent.supportContact")}
            </p>

            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-lg p-3 mt-6">
              <p className="text-blue-200 font-medium text-xs">
                <strong>
                  {translate("auth.termsOfServiceContent.finalAcknowledgment")}
                </strong>
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2 border-t border-white/10 mt-2 flex justify-center items-center">
          <a
            href="#"
            className="text-indigo-400 hover:text-indigo-300 transition-colors text-sm flex items-center gap-1 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20"
            onClick={(e) => {
              e.preventDefault();
              // Open Enhanced Terms of Service document in new browser window
              window.open(
                "/assets/terms-of-service-enhanced.html",
                "_blank",
                "noopener,noreferrer",
              );
            }}
          >
            <ExternalLink className="h-4 w-4" />
            <span>{translate("auth.viewFullTerms")}</span>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
