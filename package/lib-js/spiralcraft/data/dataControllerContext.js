// An interface provided by a control to bind a data source and events to a child 
//    view
export default function(options)
{
  const defaults = 
  {
    onSave: (data) => {}, // Called by the child when it updates its data
    onTrash: () => {}, // Called by the child when it trashes (deletes) the data
    key: null, // Holds the key of the data relevant to the child
    cursor: null, // Holds the data relevant to the child
  }
  
  const context =
  {
    ...defaults
    ,...options
  };
  return context;
}