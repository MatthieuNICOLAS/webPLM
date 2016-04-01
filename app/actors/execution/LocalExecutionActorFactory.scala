package actors.execution

import akka.actor.ActorSystem
import com.google.inject.Inject
import com.google.inject.Singleton
import play.api.i18n.Lang
import akka.actor.ActorRef
import play.api.Logger

/**
 * @author matthieu
 */

@Singleton
class LocalExecutionActorFactory @Inject() (system: ActorSystem) extends ExecutionActorFactory {
  def create(optLang: Option[Lang]): ActorRef = {
    Logger.error("On va servir un LOCAL")
    val lang: Lang = optLang.getOrElse(Lang("en"))
    system.actorOf(LocalExecutionActor.props(lang))
  }
}