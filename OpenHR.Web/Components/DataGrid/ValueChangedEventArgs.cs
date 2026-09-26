namespace OpenHR.Web.Components.DataGrid;

public class ValueChangedEventArgs<TGridItem, TProp>(TGridItem item, TProp newValue)
{
    public TGridItem Item { get; private set; } = item;

    public TProp NewValue { get; private set; } = newValue;
}
