package actors.execution

import spies.OperationSpy
import org.xnap.commons.i18n.I18nFactory
import plm.core.model.lesson.Exercise
import plm.core.model.lesson.ExecutionProgress
import akka.actor.Props
import plm.core.lang.ProgrammingLanguage
import plm.core.model.lesson.ExerciseRunner
import log.PLMLogger
import org.xnap.commons.i18n.I18n
import play.api.Logger
import akka.actor.Actor
import play.api.i18n.Lang
import akka.actor.ActorRef
import plm.core.model.lesson.Exercise.WorldKind
import plm.universe.World

/**
 * @author matthieu
 */

object LocalExecutionActor {
  def props(initialLang: Lang) = Props(new LocalExecutionActor(initialLang))
}

class LocalExecutionActor(initialLang: Lang) extends ExecutionActor {
  import ExecutionActor._
  
  var currentI18n: I18n = I18nFactory.getI18n(getClass(),"org.plm.i18n.Messages", initialLang.toLocale, I18nFactory.FALLBACK);
  val exerciseRunner: ExerciseRunner = new ExerciseRunner(logger, currentI18n)
  
  var registeredSpies: Array[OperationSpy] = Array()

  def receive =  {
    case StartExecution(out, exercise, progLang, code) =>
      addOperationSpies(out, exercise, progLang)
      val executionResult: ExecutionProgress = exerciseRunner.run(exercise, progLang, code)
      registeredSpies.foreach { spy => 
        spy.sendOperations
        spy.unregister
      }
      registeredSpies = Array()
      sender ! executionResult
    case StopExecution() =>
      // TODO: Implement me
    case UpdateLang(lang: Lang) =>
      currentI18n = I18nFactory.getI18n(getClass(),"org.plm.i18n.Messages", lang.toLocale, I18nFactory.FALLBACK);
      exerciseRunner.setI18n(currentI18n)
    case _ =>
      Logger.error("LessonsActor: not supported message")
  }

  def addOperationSpies(out: ActorRef, exercise: Exercise, progLang: ProgrammingLanguage) {
    exercise.getWorlds(WorldKind.CURRENT).toArray(Array[World]()).foreach { world =>
      val worldSpy: OperationSpy = new OperationSpy(out, world, progLang)
      registeredSpies = registeredSpies.+:(worldSpy)
    }
  }
}