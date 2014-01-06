import sbt._
import Keys._
import play.Project._

object ApplicationBuild extends Build {

  val appName         = "edi"
  val appVersion      = "0.1"

  val appDependencies = Seq(
    // Add your project dependencies here,
    javaCore,
    javaJdbc,
    javaEbean,
    "postgresql" % "postgresql" % "9.1-901.jdbc4",
    "org.milyn" % "milyn-smooks-core" % "1.5.1", 
    "org.milyn" % "milyn-smooks-javabean" % "1.5.1",
    "org.milyn" % "milyn-smooks-edi" % "1.5.1"
  )

  val main = play.Project(appName, appVersion, appDependencies).settings(
    // Add your own project settings here   
    
  )

}
