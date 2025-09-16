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
import { Shield, ExternalLink } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/hooks/use-language";

interface PrivacyPolicyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PrivacyPolicyDialog({
  open,
  onOpenChange,
}: PrivacyPolicyDialogProps) {
  const { translate } = useLanguage();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[90vw] sm:max-w-[650px] max-h-[85vh] border-none bg-gradient-to-br from-gray-900/95 to-purple-900/95 backdrop-blur-xl text-white rounded-xl shadow-[0_0_40px_rgba(139,92,246,0.25)]">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500 rounded-t-xl"></div>
        <DialogHeader className="pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-400" />
            <DialogTitle className="text-xl font-bold tracking-tight">
              {translate("auth.privacyPolicyTitle")}
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/70 pt-2">
            {translate("auth.lastUpdated")}: July 14, 2025 | {translate("auth.effectiveDate")}: July 14, 2025
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="mt-2 pr-4 max-h-[60vh]">
          <div className="space-y-4 text-white/80 text-sm">
            <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-200 font-medium text-xs">
                <strong>{translate("auth.yourPrivacyMatters")}:</strong> {translate("auth.privacyPolicyDescription")}
              </p>
            </div>

            <p>
              {translate("auth.privacyPolicyContent.welcomeText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.informationWeCollect")}
            </h2>
            <p>
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.informationYouProvideDirectly")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                <strong>{translate("auth.privacyPolicyContent.accountInformation")}</strong> {translate("auth.privacyPolicyContent.accountInformationText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.profileInformation")}</strong> {translate("auth.privacyPolicyContent.profileInformationText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.datingNetworkingPreferences")}</strong> {translate("auth.privacyPolicyContent.datingNetworkingPreferencesText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.communications")}</strong> {translate("auth.privacyPolicyContent.communicationsText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.paymentInformation")}</strong> {translate("auth.privacyPolicyContent.paymentInformationText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.verificationData")}</strong> {translate("auth.privacyPolicyContent.verificationDataText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.userGeneratedContent")}</strong> {translate("auth.privacyPolicyContent.userGeneratedContentText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.customerSupportCommunications")}</strong> {translate("auth.privacyPolicyContent.customerSupportCommunicationsText")}
              </li>
            </ul>

            <p className="mt-4">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.informationWeCollectAutomatically")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                <strong>{translate("auth.privacyPolicyContent.deviceInformation")}</strong> {translate("auth.privacyPolicyContent.deviceInformationText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.usageData")}</strong> {translate("auth.privacyPolicyContent.usageDataText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.locationInformation")}</strong> {translate("auth.privacyPolicyContent.locationInformationText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.technicalData")}</strong> {translate("auth.privacyPolicyContent.technicalDataText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.networkInformation")}</strong> {translate("auth.privacyPolicyContent.networkInformationText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.behavioralAnalytics")}</strong> {translate("auth.privacyPolicyContent.behavioralAnalyticsText")}
              </li>
            </ul>

            <p className="mt-4">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.informationFromThirdParties")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                <strong>{translate("auth.privacyPolicyContent.socialMedia")}</strong> {translate("auth.privacyPolicyContent.socialMediaText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.identityVerificationServices")}</strong> {translate("auth.privacyPolicyContent.identityVerificationServicesText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.paymentProcessors")}</strong> {translate("auth.privacyPolicyContent.paymentProcessorsText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.analyticsPartners")}</strong> {translate("auth.privacyPolicyContent.analyticsPartnersText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.marketingPartners")}</strong> {translate("auth.privacyPolicyContent.marketingPartnersText")}
              </li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.howWeUseYourInformation")}
            </h2>
            <p>
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.coreServiceFunctions")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.coreServiceFunctionsList.0")}</li>
              <li>
                {translate("auth.privacyPolicyContent.coreServiceFunctionsList.1")}
              </li>
              <li>{translate("auth.privacyPolicyContent.coreServiceFunctionsList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.coreServiceFunctionsList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.coreServiceFunctionsList.4")}</li>
              <li>{translate("auth.privacyPolicyContent.coreServiceFunctionsList.5")}</li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.platformSafetyAndSecurity")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.platformSafetyAndSecurityList.0")}</li>
              <li>{translate("auth.privacyPolicyContent.platformSafetyAndSecurityList.1")}</li>
              <li>
                {translate("auth.privacyPolicyContent.platformSafetyAndSecurityList.2")}
              </li>
              <li>{translate("auth.privacyPolicyContent.platformSafetyAndSecurityList.3")}</li>
              <li>
                {translate("auth.privacyPolicyContent.platformSafetyAndSecurityList.4")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.serviceImprovementAndPersonalization")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.serviceImprovementAndPersonalizationList.0")}
              </li>
              <li>{translate("auth.privacyPolicyContent.serviceImprovementAndPersonalizationList.1")}</li>
              <li>{translate("auth.privacyPolicyContent.serviceImprovementAndPersonalizationList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.serviceImprovementAndPersonalizationList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.serviceImprovementAndPersonalizationList.4")}</li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.communicationsAndMarketing")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.communicationsAndMarketingList.0")}</li>
              <li>
                {translate("auth.privacyPolicyContent.communicationsAndMarketingList.1")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.communicationsAndMarketingList.2")}
              </li>
              <li>{translate("auth.privacyPolicyContent.communicationsAndMarketingList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.communicationsAndMarketingList.4")}</li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.howWeShareYourInformation")}
            </h2>
            <p>
              <strong className="text-purple-300">{translate("auth.privacyPolicyContent.withOtherUsers")}</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.withOtherUsersList.0")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.withOtherUsersList.1")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.withOtherUsersList.2")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.withOtherUsersList.3")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.withServiceProviders")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                <strong>{translate("auth.privacyPolicyContent.cloudInfrastructure")}</strong> {translate("auth.privacyPolicyContent.cloudInfrastructureText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.paymentProcessing")}</strong> {translate("auth.privacyPolicyContent.paymentProcessingText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.analytics")}</strong> {translate("auth.privacyPolicyContent.analyticsText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.customerSupport")}</strong> {translate("auth.privacyPolicyContent.customerSupportText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.communicationsServices")}</strong> {translate("auth.privacyPolicyContent.communicationsServicesText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.contentModeration")}</strong> {translate("auth.privacyPolicyContent.contentModerationText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.identityVerification")}</strong> {translate("auth.privacyPolicyContent.identityVerificationText")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.forLegalAndSafetyReasons")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.forLegalAndSafetyReasonsList.0")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.forLegalAndSafetyReasonsList.1")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.forLegalAndSafetyReasonsList.2")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.forLegalAndSafetyReasonsList.3")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.forLegalAndSafetyReasonsList.4")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.businessTransfers")}
              </strong>
            </p>
            <p className="text-xs mt-2">
              {translate("auth.privacyPolicyContent.businessTransfersText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.yourPrivacyRightsAndChoices")}
            </h2>
            <p>
              <strong className="text-purple-300">{translate("auth.privacyPolicyContent.accountControl")}</strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                <strong>{translate("auth.privacyPolicyContent.profileManagement")}</strong> {translate("auth.privacyPolicyContent.profileManagementText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.privacySettings")}</strong> {translate("auth.privacyPolicyContent.privacySettingsText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.communicationPreferences")}</strong> {translate("auth.privacyPolicyContent.communicationPreferencesText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.blockingAndReporting")}</strong> {translate("auth.privacyPolicyContent.blockingAndReportingText")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.dataRightsGdprCcpa")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                <strong>{translate("auth.privacyPolicyContent.accessRight")}</strong> {translate("auth.privacyPolicyContent.accessRightText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.portabilityRight")}</strong> {translate("auth.privacyPolicyContent.portabilityRightText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.correctionRight")}</strong> {translate("auth.privacyPolicyContent.correctionRightText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.deletionRight")}</strong> {translate("auth.privacyPolicyContent.deletionRightText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.restrictionRight")}</strong> {translate("auth.privacyPolicyContent.restrictionRightText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.objectionRight")}</strong> {translate("auth.privacyPolicyContent.objectionRightText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.withdrawConsentRight")}</strong> {translate("auth.privacyPolicyContent.withdrawConsentRightText")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.deviceAndBrowserControls")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                <strong>{translate("auth.privacyPolicyContent.locationServices")}</strong> {translate("auth.privacyPolicyContent.locationServicesText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.pushNotifications")}</strong> {translate("auth.privacyPolicyContent.pushNotificationsText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.cameraAndMicrophone")}</strong> {translate("auth.privacyPolicyContent.cameraAndMicrophoneText")}
              </li>
              <li>
                <strong>{translate("auth.privacyPolicyContent.cookies")}</strong> {translate("auth.privacyPolicyContent.cookiesText")}
              </li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.dataSecurityAndProtection")}
            </h2>
            <p>
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.technicalSafeguards")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.technicalSafeguardsList.0")}
              </li>
              <li>{translate("auth.privacyPolicyContent.technicalSafeguardsList.1")}</li>
              <li>{translate("auth.privacyPolicyContent.technicalSafeguardsList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.technicalSafeguardsList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.technicalSafeguardsList.4")}</li>
              <li>{translate("auth.privacyPolicyContent.technicalSafeguardsList.5")}</li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.operationalSecurity")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.operationalSecurityList.0")}</li>
              <li>{translate("auth.privacyPolicyContent.operationalSecurityList.1")}</li>
              <li>{translate("auth.privacyPolicyContent.operationalSecurityList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.operationalSecurityList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.operationalSecurityList.4")}</li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.dataBreachResponse")}
              </strong>
            </p>
            <p className="text-xs mt-2">
              {translate("auth.privacyPolicyContent.dataBreachResponseText")}
            </p>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.dataRetentionAndDeletion")}
            </h2>
            <p>
              <strong className="text-purple-300">{translate("auth.privacyPolicyContent.activeAccounts")}</strong>{" "}
              {translate("auth.privacyPolicyContent.activeAccountsText")}
            </p>
            <p className="mt-2">
              <strong className="text-purple-300">{translate("auth.privacyPolicyContent.accountDeletion")}</strong>{" "}
              {translate("auth.privacyPolicyContent.accountDeletionText")}
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.accountDeletionList.0")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.accountDeletionList.1")}
              </li>
              <li>{translate("auth.privacyPolicyContent.accountDeletionList.2")}</li>
              <li>
                {translate("auth.privacyPolicyContent.accountDeletionList.3")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.legalRetentionRequirements")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.legalRetentionRequirementsList.0")}
              </li>
              <li>{translate("auth.privacyPolicyContent.legalRetentionRequirementsList.1")}</li>
              <li>
                {translate("auth.privacyPolicyContent.legalRetentionRequirementsList.2")}
              </li>
              <li>{translate("auth.privacyPolicyContent.legalRetentionRequirementsList.3")}</li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.internationalDataTransfers")}
            </h2>
            <p>
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.globalOperations")}
              </strong>{" "}
              {translate("auth.privacyPolicyContent.globalOperationsText")}
            </p>
            <p className="mt-2">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.transferSafeguards")}
              </strong>{" "}
              {translate("auth.privacyPolicyContent.transferSafeguardsText")}
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.transferSafeguardsList.0")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.transferSafeguardsList.1")}
              </li>
              <li>{translate("auth.privacyPolicyContent.transferSafeguardsList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.transferSafeguardsList.3")}</li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.artificialIntelligenceAndAutomatedDecisionMaking")}
            </h2>
            <p>
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.aiPoweredFeatures")}
              </strong>{" "}
              {translate("auth.privacyPolicyContent.aiPoweredFeaturesText")}
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.aiPoweredFeaturesList.0")}</li>
              <li>{translate("auth.privacyPolicyContent.aiPoweredFeaturesList.1")}</li>
              <li>{translate("auth.privacyPolicyContent.aiPoweredFeaturesList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.aiPoweredFeaturesList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.aiPoweredFeaturesList.4")}</li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">{translate("auth.privacyPolicyContent.yourAiRights")}</strong> {translate("auth.privacyPolicyContent.yourAiRightsText")}
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.yourAiRightsList.0")}
              </li>
              <li>{translate("auth.privacyPolicyContent.yourAiRightsList.1")}</li>
              <li>{translate("auth.privacyPolicyContent.yourAiRightsList.2")}</li>
              <li>
                {translate("auth.privacyPolicyContent.yourAiRightsList.3")}
              </li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.childrensPrivacy")}
            </h2>
            <p>
              <strong className="text-purple-300">{translate("auth.privacyPolicyContent.ageRequirements")}</strong>{" "}
              {translate("auth.privacyPolicyContent.ageRequirementsText")}
            </p>
            <p className="mt-2">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.underageAccountDetection")}
              </strong>{" "}
              {translate("auth.privacyPolicyContent.underageAccountDetectionText")}
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.underageAccountDetectionList.0")}</li>
              <li>{translate("auth.privacyPolicyContent.underageAccountDetectionList.1")}</li>
              <li>{translate("auth.privacyPolicyContent.underageAccountDetectionList.2")}</li>
              <li>
                {translate("auth.privacyPolicyContent.underageAccountDetectionList.3")}
              </li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.stateAndRegionalPrivacyRights")}
            </h2>
            <p>
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.californiaPrivacyRights")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.californiaPrivacyRightsList.0")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.californiaPrivacyRightsList.1")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.californiaPrivacyRightsList.2")}
              </li>
              <li>{translate("auth.privacyPolicyContent.californiaPrivacyRightsList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.californiaPrivacyRightsList.4")}</li>
              <li>{translate("auth.privacyPolicyContent.californiaPrivacyRightsList.5")}</li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.europeanPrivacyRights")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.europeanPrivacyRightsList.0")}
              </li>
              <li>{translate("auth.privacyPolicyContent.europeanPrivacyRightsList.1")}</li>
              <li>{translate("auth.privacyPolicyContent.europeanPrivacyRightsList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.europeanPrivacyRightsList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.europeanPrivacyRightsList.4")}</li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.cookiesAndTrackingTechnologies")}
            </h2>
            <p>
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.typesOfCookiesWeUse")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.typesOfCookiesWeUseList.0")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.typesOfCookiesWeUseList.1")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.typesOfCookiesWeUseList.2")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.typesOfCookiesWeUseList.3")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.thirdPartyTracking")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.thirdPartyTrackingList.0")}</li>
              <li>
                {translate("auth.privacyPolicyContent.thirdPartyTrackingList.1")}
              </li>
              <li>{translate("auth.privacyPolicyContent.thirdPartyTrackingList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.thirdPartyTrackingList.3")}</li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.updatesToThisPrivacyPolicy")}
            </h2>
            <p>
              <strong className="text-purple-300">{translate("auth.privacyPolicyContent.policyChanges")}</strong>{" "}
              {translate("auth.privacyPolicyContent.policyChangesText")}
            </p>
            <p className="mt-2">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.notificationProcess")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.notificationProcessList.0")}</li>
              <li>{translate("auth.privacyPolicyContent.notificationProcessList.1")}</li>
              <li>{translate("auth.privacyPolicyContent.notificationProcessList.2")}</li>
              <li>{translate("auth.privacyPolicyContent.notificationProcessList.3")}</li>
              <li>{translate("auth.privacyPolicyContent.notificationProcessList.4")}</li>
            </ul>

            <h2 className="text-lg font-semibold text-white mt-6">
              {translate("auth.privacyPolicyContent.contactInformationAndExercisingYourRights")}
            </h2>
            <p>
              <strong className="text-purple-300">{translate("auth.privacyPolicyContent.contactDetails")}</strong>
              <br />
              {translate("auth.privacyPolicyContent.contactDetailsText")}
              <br />
              {translate("auth.privacyPolicyContent.dataProtectionTeam")}
              <br />
              {translate("auth.privacyPolicyContent.emailPrivacy")}
              <br />
              {translate("auth.privacyPolicyContent.legalDepartment")}
              <br />
              {translate("auth.privacyPolicyContent.dataProtectionOfficer")}
            </p>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.exercisingPrivacyRights")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>{translate("auth.privacyPolicyContent.exercisingPrivacyRightsList.0")}</li>
              <li>
                {translate("auth.privacyPolicyContent.exercisingPrivacyRightsList.1")}
              </li>
              <li>{translate("auth.privacyPolicyContent.exercisingPrivacyRightsList.2")}</li>
              <li>
                {translate("auth.privacyPolicyContent.exercisingPrivacyRightsList.3")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.exercisingPrivacyRightsList.4")}
              </li>
            </ul>

            <p className="mt-3">
              <strong className="text-purple-300">
                {translate("auth.privacyPolicyContent.complaintsAndDisputes")}
              </strong>
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2 text-xs">
              <li>
                {translate("auth.privacyPolicyContent.complaintsAndDisputesList.0")}
              </li>
              <li>{translate("auth.privacyPolicyContent.complaintsAndDisputesList.1")}</li>
              <li>
                {translate("auth.privacyPolicyContent.complaintsAndDisputesList.2")}
              </li>
              <li>
                {translate("auth.privacyPolicyContent.complaintsAndDisputesList.3")}
              </li>
            </ul>

            <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30 rounded-lg p-3 mt-6">
              <p className="text-green-200 font-medium text-xs">
                <strong>{translate("auth.privacyPolicyContent.transparencyCommitment")}</strong> {translate("auth.privacyPolicyContent.transparencyCommitmentText")}
              </p>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-2 border-t border-white/10 mt-2 flex justify-center items-center">
          <a
            href="#"
            className="text-purple-400 hover:text-purple-300 transition-colors text-sm flex items-center gap-1 bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20"
            onClick={(e) => {
              e.preventDefault();
              // Open Enhanced Privacy Policy document in new browser window
              window.open('/assets/privacy-policy-enhanced.html', '_blank', 'noopener,noreferrer');
            }}
          >
            <ExternalLink className="h-4 w-4" />
            <span>{translate("auth.viewFullPolicy")}</span>
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
