package views.support

import conf.Configuration.environment

object GoogleAnalyticsAccount {

  private val prod = "UA-33592456-1"
  private val test = "UA-75852724-1"
  private val useMainAccount = environment.isProd && !environment.isPreview

  val account: String = if (useMainAccount) prod else test

  // percentage of traffic to use in test
  val samplePercent: Int = if (useMainAccount) 1 else 100

}