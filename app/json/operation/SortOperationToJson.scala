package json.operation

import play.api.libs.json._

import plm.universe.sort.operations._


object SortOperationToJson {

	def sortOperationWrite(sortOperation: SortOperation): JsValue =
	{
		var json:JsValue = null
		sortOperation match {
      case setValOperation: SetValOperation =>
        json = setValOperationWrite(setValOperation)
      case swapOperation: SwapOperation =>
        json = swapOperationWrite(swapOperation)
      case copyOperation: CopyOperation =>
        json = copyOperationWrite(copyOperation)
      case _ => json = Json.obj()
    }
    json = json.as[JsObject] ++ Json.obj(
        "sortID" -> sortOperation.getEntity.getName )
       return json 
  }
  
  def swapOperationWrite(swapOperation: SwapOperation): JsValue =
  {
    Json.obj(
      "destination" -> swapOperation.getDestination(),
      "source" -> swapOperation.getSource()
    )
	}
  
  def copyOperationWrite(copyOperation: CopyOperation): JsValue =
  {
    Json.obj(
      "destination" -> copyOperation.getDestination(),
      "source" -> copyOperation.getSource()
    )
  }
  
  def setValOperationWrite(setValOperation: SetValOperation): JsValue =
  {
    Json.obj(
        "value" -> setValOperation.getValue(),
        "oldValue" -> setValOperation.getOldValue(),
        "position" -> setValOperation.getPosition()
    )
    
  }
}