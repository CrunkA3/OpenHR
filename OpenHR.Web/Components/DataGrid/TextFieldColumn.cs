using Microsoft.AspNetCore.Components;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using Microsoft.FluentUI.AspNetCore.Components;
using System.Linq.Expressions;

namespace OpenHR.Web.Components.DataGrid;

public class TextFieldColumn<TGridItem, TProp> : TemplateColumn<TGridItem>
{
    private Func<TGridItem, TProp>? _getter;
    private Action<TGridItem, TProp>? _setter;



    [EditorRequired]
    [Parameter]
    public Expression<Func<TGridItem, TProp>> Property { get; set; } = default!;

    [Parameter]
    public bool Required { get; set; } = false;

    [Parameter]
    public bool Immediate { get; set; } = true;

    [Parameter]
    public int ImmediateDelay { get; set; } = 500;

    [Parameter]
    public string? Placeholder { get; set; }

    [Parameter]
    public EventCallback<ValueChangedEventArgs<TGridItem, TProp>> ValueChanged { get; set; }





    public TextFieldColumn()
    {
        ChildContent = RenderDefault;
    }

    protected override void OnParametersSet()
    {
        base.OnParametersSet();

        _getter ??= Property.Compile();
        _setter ??= CreateSetter(Property);
    }

    private static Action<TGridItem, TProp> CreateSetter(Expression<Func<TGridItem, TProp>> expr)
    {
        if (expr.Body is MemberExpression member)
        {
            var paramItem = Expression.Parameter(typeof(TGridItem));
            var paramValue = Expression.Parameter(typeof(TProp));

            var assign = Expression.Assign(
                Expression.MakeMemberAccess(paramItem, member.Member),
                paramValue
            );

            return Expression.Lambda<Action<TGridItem, TProp>>(assign, paramItem, paramValue).Compile();
        }

        throw new InvalidOperationException("Expression must be a property access.");
    }

    private RenderFragment<TGridItem> RenderDefault => (item) => builder =>
    {
        var value = _getter!(item);

        builder.OpenComponent(0, typeof(FluentTextInput));
        builder.AddAttribute(1, "Value", value);
        builder.AddAttribute(2, "ValueChanged",
            EventCallback.Factory.Create<TProp>(this, async v =>
            {
                _setter!(item, v);

                if (ValueChanged.HasDelegate) await ValueChanged.InvokeAsync();
            }));
        builder.AddAttribute(3, "Required", Required);
        builder.AddAttribute(4, "Immediate", Immediate);
        builder.AddAttribute(5, "ImmediateDelay", ImmediateDelay);
        builder.AddAttribute(6, "Placeholder", Placeholder);

        builder.CloseComponent();
    };



}
